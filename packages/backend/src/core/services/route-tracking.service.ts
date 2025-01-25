import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Shipment,
  ShipmentStatus,
} from '../../shipments/entities/shipment.entity';
import { LocationService } from '../../common/services/location.service';
import { Route } from '../../routes/entities/route.entity';
import { RouteStop } from '../../routes/entities/routeStop.entity';
import { StopType } from 'src/routes/route-optimization.service';
import { RouteStatus } from '../../routes/entities/route.entity';
import { UpdateLocationDto } from '../../routes/dto/update-location.dto';
import { RouteOptimizationService } from '../../routes/route-optimization.service';
import { LocationDto } from 'src/common/dto/location.dto';

interface PostGISPoint {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

@Injectable()
export class RouteTrackingService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(RouteStop)
    private readonly routeStopRepository: Repository<RouteStop>,
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    private readonly locationService: LocationService,
    private readonly routeOptimizationService: RouteOptimizationService,
  ) {}

  async updateCarrierLocation(
    carrierId: string,
    location: UpdateLocationDto,
  ): Promise<{
    updatedRoute: Route;
    updatedStops: RouteStop[];
    updatedShipments: Shipment[];
  }> {
    const route = await this.routeRepository.findOne({
      where: {
        carrier: { principal: carrierId },
        status: RouteStatus.ACTIVE,
      },
      relations: ['stops', 'stops.shipment'],
    });

    if (!route) throw new NotFoundException('No active route found');

    // Update current location
    route.lastLocation = LocationDto.toGeoJSON(location.lng, location.lat);
    route.lastLocationUpdate = new Date(location.timestamp);

    // Check for nearby stops and update statuses
    const { updatedStops, updatedShipments } = await this.checkAndUpdateStops(
      route,
      { lat: location.lat, lng: location.lng },
    );

    // Recalculate route metrics with new location
    const updatedMetrics = await this.recalculateRouteMetrics(route, {
      lat: location.lat,
      lng: location.lng,
    });
    route.metrics = updatedMetrics;

    const updatedRoute = await this.routeRepository.save(route);

    // Check if route is completed
    if (
      updatedStops.length > 0 &&
      route.stops.every(
        (stop) =>
          stop.actualArrival ||
          stop.stopType === 'START' ||
          stop.stopType === 'END',
      )
    ) {
      updatedRoute.status = RouteStatus.COMPLETED;
      updatedRoute.completedAt = new Date();
      await this.routeRepository.save(updatedRoute);
    }

    return {
      updatedRoute,
      updatedStops,
      updatedShipments,
    };
  }

  private async checkAndUpdateStops(
    route: Route,
    currentLocation: LocationDto,
  ) {
    const updatedStops: RouteStop[] = [];
    const updatedShipments: Shipment[] = [];

    // Get first uncompleted shipment stop (ignoring START/END)
    const currentStop = route.stops.find(
      (stop) =>
        !stop.actualArrival &&
        (stop.stopType === 'PICKUP' || stop.stopType === 'DELIVERY'),
    );

    if (currentStop && (await this.isNearStop(currentLocation, currentStop))) {
      currentStop.actualArrival = new Date();
      const updatedStop = await this.routeStopRepository.save(currentStop);
      updatedStops.push(updatedStop);

      // Update shipment status if it's a pickup or delivery stop
      if (currentStop.shipment) {
        currentStop.shipment.status = this.getNextShipmentStatus(
          currentStop.shipment.status,
          currentStop.stopType,
        );
        const updatedShipment = await this.shipmentRepository.save(
          currentStop.shipment,
        );
        updatedShipments.push(updatedShipment);
      }
    }

    return { updatedStops, updatedShipments };
  }

  private async recalculateRouteMetrics(
    route: Route,
    currentLocation: LocationDto,
  ) {
    const completedStops = route.stops.filter(
      (stop) =>
        stop.actualArrival &&
        (stop.stopType === 'PICKUP' || stop.stopType === 'DELIVERY'),
    ).length;

    const totalStops = route.stops.filter(
      (stop) => stop.stopType === 'PICKUP' || stop.stopType === 'DELIVERY',
    ).length;

    // Get remaining stops in sequence
    const remainingStops = route.stops
      .filter(
        (s) =>
          !s.actualArrival &&
          (s.stopType === 'PICKUP' || s.stopType === 'DELIVERY'),
      )
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex);

    // Calculate new route from current location through remaining stops
    if (remainingStops.length > 0) {
      const locations = [
        { lat: currentLocation.lat, lng: currentLocation.lng, type: StopType.START },
        ...remainingStops.map((stop) => ({
          lat: (stop.location as PostGISPoint).coordinates[1],
          lng: (stop.location as PostGISPoint).coordinates[0],
          type: stop.stopType as StopType
        })),
      ];

      // Get new route details from routing service
      const routeDetails =
        await this.routeOptimizationService.getDetailedRoute(locations);
      const segments = routeDetails.data.features[0].properties.segments;

      // Update ETAs for remaining stops
      let cumulativeTime = 0;
      remainingStops.forEach((stop, index) => {
        cumulativeTime += segments[index].duration;
        stop.estimatedArrival = new Date(Date.now() + cumulativeTime * 1000);
      });

      await this.routeStopRepository.save(remainingStops);

      const remainingDistance =
        segments.reduce((sum, segment) => sum + segment.distance, 0) / 1000; // Convert to km

      return {
        ...route.metrics,
        progress: {
          completedStops,
          totalStops,
          completedDistance: route.totalDistance - remainingDistance,
          remainingDistance,
          isDelayed: this.checkIfDelayed(route),
          lastLocation: route.lastLocation,
          lastUpdate: route.lastLocationUpdate,
        },
      };
    }

    // If no remaining stops, return completed metrics
    return {
      ...route.metrics,
      progress: {
        completedStops,
        totalStops,
        completedDistance: route.totalDistance,
        remainingDistance: 0,
        isDelayed: false,
        lastLocation: route.lastLocation,
        lastUpdate: route.lastLocationUpdate,
      },
    };
  }

  private async isNearStop(
    currentLocation: LocationDto,
    stop: RouteStop,
  ): Promise<boolean> {
    // Extract coordinates from PostGIS point
    const stopLocation = (stop.location as any).coordinates;
    return this.locationService.isPointNearby(
      currentLocation,
      {
        lat: stopLocation[1], // PostGIS stores as [lng, lat]
        lng: stopLocation[0],
      },
      0.2, // 200 meters threshold
    );
  }

  private async calculateRemainingDistance(
    currentLocation: LocationDto,
    remainingStops: RouteStop[],
  ): Promise<number> {
    if (remainingStops.length === 0) return 0;

    // Calculate distance from current location to next stop
    const nextStop = remainingStops[0];
    const nextStopLocation = (nextStop.location as any).coordinates;
    const distanceToNext = this.locationService.calculateDistance(
      currentLocation,
      {
        lat: nextStopLocation[1],
        lng: nextStopLocation[0],
      },
    );

    // Use PostGIS for calculating remaining segment distances
    if (remainingStops.length > 1) {
      const stopsQuery = await this.routeStopRepository
        .createQueryBuilder('stop')
        .select(
          'SUM(ST_Length(ST_MakeLine(stop.location, next_stop.location)::geography)) / 1000',
          'total_distance',
        )
        .innerJoin(
          'route_stop',
          'next_stop',
          'stop."sequenceIndex" + 1 = next_stop."sequenceIndex"',
        )
        .where('stop.id IN (:...stopIds)', {
          stopIds: remainingStops.slice(1).map((s) => s.id),
        })
        .getRawOne();

      return distanceToNext + (stopsQuery.total_distance || 0);
    }

    return distanceToNext;
  }

  private checkIfDelayed(route: Route): boolean {
    const currentTime = new Date();
    const activeStops = route.stops.filter((stop) => !stop.actualArrival);

    if (activeStops.length === 0) return false;

    const nextStop = activeStops[0];
    return currentTime > nextStop.estimatedArrival;
  }

  private getNextShipmentStatus(
    currentStatus: ShipmentStatus,
    stopType: StopType,
  ): ShipmentStatus {
    if (
      stopType === StopType.PICKUP &&
      currentStatus === ShipmentStatus.ROUTE_SET
    ) {
      return ShipmentStatus.PICKED_UP;
    } else if (
      stopType === StopType.DELIVERY &&
      currentStatus === ShipmentStatus.PICKED_UP
    ) {
      return ShipmentStatus.IN_TRANSIT;
    } else if (
      stopType === StopType.DELIVERY &&
      currentStatus === ShipmentStatus.IN_TRANSIT
    ) {
      return ShipmentStatus.DELIVERED;
    }

    return currentStatus;
  }
}

//   async checkAndUpdateStatuses(route: Route): Promise<Shipment[]> {
//     const updatedShipments: Shipment[] = [];
//     const currentLocation = {
//       latitude: route.currentLatitude,
//       longitude: route.currentLongitude
//     };

//     for (const shipment of route.shipments) {
//       const statusUpdate = await this.checkShipmentStatus(shipment, currentLocation);
//       if (statusUpdate) {
//         updatedShipments.push(statusUpdate);
//       }
//     }

//     return updatedShipments;
//   }

//   calculateETAFromRoute(shipment: Shipment, route: Route): number {
//     const shipmentIndex = route.shipments.findIndex(s => s.id === shipment.id);
//     if (shipmentIndex === -1) return 0;

//     let remainingTime = 0;
//     for (let i = shipmentIndex; i < route.segments.length; i++) {
//       remainingTime += route.segments[i].duration;
//     }

//     return Math.ceil(remainingTime / 60);
//   }

//   extractRouteSegment(shipment: Shipment, route: Route): { points: Array<{ lat: number; lng: number }> } {
//     const shipmentIndex = route.shipments.findIndex(s => s.id === shipment.id);
//     if (shipmentIndex === -1) return { points: [] };

//     return {
//       points: route.optimizedPoints.slice(
//         shipmentIndex * 2,
//         (shipmentIndex + 1) * 2
//       )
//     };
//   }

//   private async checkShipmentStatus(
//     shipment: Shipment,
//     currentLocation: { latitude: number; longitude: number }
//   ): Promise<Shipment | null> {
//     const target = this.getTargetLocation(shipment);

//     if (this.locationService.isPointNearby(currentLocation, target)) {
//       const previousStatus = shipment.status;
//       shipment.status = this.getNextStatus(previousStatus);

//       if (shipment.status !== previousStatus) {
//         await this.shipmentRepository.save(shipment);
//         return shipment;
//       }
//     }

//     return null;
//   }

//   private getTargetLocation(shipment: Shipment): { latitude: number; longitude: number } {
//     return shipment.status === ShipmentStatus.READY_FOR_PICKUP
//       ? shipment.pickupAddress
//       : shipment.deliveryAddress;
//   }

//   private getNextStatus(currentStatus: ShipmentStatus): ShipmentStatus {
//     const statusFlow = {
//       [ShipmentStatus.READY_FOR_PICKUP]: ShipmentStatus.PICKED_UP,
//       [ShipmentStatus.PICKED_UP]: ShipmentStatus.IN_TRANSIT,
//       [ShipmentStatus.IN_TRANSIT]: ShipmentStatus.DELIVERED,
//     };
//     return statusFlow[currentStatus] || currentStatus;
//   }
// }

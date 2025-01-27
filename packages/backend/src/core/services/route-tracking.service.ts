import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Route, RouteStatus } from 'src/routes/entities/route.entity';
import { RouteStop } from 'src/routes/entities/routeStop.entity';
import {
  Shipment,
  ShipmentStatus,
} from 'src/shipments/entities/shipment.entity';

import { LocationService } from '../../common/services/location.service';
import {
  RouteSegmentUpdate,
  RoutingService,
  StopUpdate,
} from './routing.service';
import { ETAService } from './eta.service';
import { RouteDelay } from 'src/routes/entities/route-delay.entity';
import { RouteMetrics } from 'src/routes/entities/route-metrics.entity';
import { ShipmentRouteHistory } from 'src/routes/entities/shipment-route-history.entity';
import { ShipmentOperationType } from 'src/routes/entities/shipment-route-history.entity';
import {
  GeoLineString,
  GeoPoint,
  StopType,
} from 'src/routes/types/location.types';
import { UpdateLocationDto } from '../../routes/dto/update-location.dto';
import { LocationDto } from 'src/common/dto/location.dto';

export interface PostGISPoint {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

const NEARBY_THRESHOLD = 0.2; // 200 meters threshold

@Injectable()
export class RouteTrackingService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepo: Repository<Route>,
    @InjectRepository(RouteStop)
    private readonly routeStopRepository: Repository<RouteStop>,
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    private readonly locationService: LocationService,
    private readonly routingService: RoutingService,
    private readonly etaService: ETAService,
    @InjectRepository(RouteMetrics)
    private readonly routeMetricsRepo: Repository<RouteMetrics>,
    @InjectRepository(ShipmentRouteHistory)
    private readonly shipmentRouteHistoryRepo: Repository<ShipmentRouteHistory>,
  ) {}

  async updateCarrierLocation(
    carrierId: string,
    location: UpdateLocationDto,
  ): Promise<{
    updatedRoute: Route;
    updatedStops: RouteStop[];
    updatedShipments: Shipment[];
    delays: RouteDelay[];
    updatedSegments: RouteSegmentUpdate[];
    updatedStopsWithNewETAs: StopUpdate[];
  }> {
    const route = await this.routeRepo.findOne({
      where: {
        carrier: { principal: carrierId },
        status: RouteStatus.ACTIVE,
      },
      relations: ['stops', 'stops.shipment', 'metrics'],
    });

    if (!route) throw new NotFoundException('No active route found');
    console.log('route being updated', route.stops.length);

    // Update current location
    route.lastLocation = LocationDto.toGeoJSON(location.lng, location.lat);
    route.lastLocationUpdate = new Date(location.timestamp);

    // Check for nearby stops and update statuses, progress the route
    const { updatedStops, updatedShipments } = await this.checkAndUpdateRoute(
      route,
      location,
    );

    // Update ETAs and track delays, returns the updated stops with new ETAs (not saved to db, just in memory)
    const {
      remainingDistance,
      remainingDuration,
      routeGeometry,
      segments,
      updatedStops: stopsWithNewETAs,
    } = await this.etaService.updateETAs(route, location);

    const delays = await this.etaService.updateDelays(
      stopsWithNewETAs,
      route,
      location,
    );

    // Update the route path with the new calculated path
    if (segments.length > 0) {
      route.fullPath = routeGeometry;
    }

    // Calculate actual metrics
    const totalStops = route.stops.filter(
      (s) => s.stopType !== StopType.END && s.stopType !== StopType.START,
    );
    const totalStopsCount = totalStops.length;
    const completedStopsCount = totalStops.filter(
      (s) => s.actualArrival,
    ).length;

    if (!route.metrics) {
      throw new Error('Route metrics not found');
    }

    route.metrics.completedStops = completedStopsCount;
    route.metrics.totalStops = totalStopsCount;
    route.metrics.completedDistance = route.totalDistance - remainingDistance;
    route.metrics.remainingDistance = remainingDistance;
    route.metrics.isDelayed = delays.length > 0;
    route.metrics.delayMinutes =
      delays.length > 0 ? delays[0].delayMinutes : null;

    route.metrics = await this.routeMetricsRepo.save(route.metrics);

    const updatedRoute = await this.routeRepo.save(route);

    return {
      updatedRoute,
      updatedStops,
      updatedShipments,
      delays,
      updatedSegments: segments,
      updatedStopsWithNewETAs: stopsWithNewETAs,
    };
  }

  // TODO: refactor this to be more readable
  private async checkAndUpdateRoute(
    route: Route,
    currentLocation: LocationDto,
  ): Promise<{
    updatedStops: RouteStop[];
    updatedShipments: Shipment[];
  }> {
    const updatedStops: RouteStop[] = [];
    const updatedShipments: Shipment[] = [];

    // Get all uncompleted stops in sequence
    const uncompletedStops = route.stops
      .filter((stop) => !stop.actualArrival)
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex);

    if (uncompletedStops.length === 0) {
      // All stops completed, complete the route
      route.status = RouteStatus.COMPLETED;
      route.completedAt = new Date();
      await this.routeRepo.save(route);
      return { updatedStops, updatedShipments };
    }

    // Get the first uncompleted stop
    const currentStop = uncompletedStops[0];

    // If it's a START stop and route is active, mark it as completed immediately
    if (currentStop.stopType === StopType.START) {
      currentStop.actualArrival = new Date();
      const updatedStop = await this.routeStopRepository.save(currentStop);
      updatedStops.push(updatedStop);
    }
    // Only handle PICKUP stops - DELIVERY will be handled by ICP events
    else if (currentStop.stopType === StopType.PICKUP) {
      if (await this.isNearStop(currentLocation, currentStop)) {
        currentStop.actualArrival = new Date();
        const updatedStop = await this.routeStopRepository.save(currentStop);
        updatedStops.push(updatedStop);

        const hasBothStopsInRoute =
          currentStop.stopType === StopType.PICKUP &&
          uncompletedStops.find(
            (stop) =>
              stop.stopType === StopType.DELIVERY &&
              stop.shipmentId === currentStop.shipmentId,
          ) !== undefined;

        // Update shipment status
        if (currentStop.shipment) {
          const newStatus = this.getNextShipmentStatus(
            currentStop.shipment.status,
            currentStop.stopType,
            hasBothStopsInRoute,
          );
          if (newStatus !== currentStop.shipment.status) {
            currentStop.shipment.status = newStatus;
            const updatedShipment = await this.shipmentRepository.save(
              currentStop.shipment,
            );
            updatedShipments.push(updatedShipment);
          }

          // Update shipment route history
          const history = await this.shipmentRouteHistoryRepo.findOne({
            where: {
              route: { id: route.id },
              shipment: { id: currentStop.shipment?.id },
              operationType: ShipmentOperationType.PICKUP,
            },
          });

          if (history) {
            history.completedAt = new Date();
            history.isSuccessful = true;
            await this.shipmentRouteHistoryRepo.save(history);
          }
        }
      }
    }
    // Handle END stop - only if all other stops are completed
    else if (currentStop.stopType === StopType.END) {
      const otherStopsCompleted = route.stops
        .filter((stop) => stop.id !== currentStop.id)
        .every((stop) => stop.actualArrival);

      if (otherStopsCompleted) {
        currentStop.actualArrival = new Date();
        const updatedStop = await this.routeStopRepository.save(currentStop);
        updatedStops.push(updatedStop);

        // Complete the route
        route.status = RouteStatus.COMPLETED;
        route.completedAt = new Date();
        await this.routeRepo.save(route);
      }
    }

    return { updatedStops, updatedShipments };
  }

  private async isNearStop(
    currentLocation: LocationDto,
    stop: RouteStop,
  ): Promise<boolean> {
    const stopLocation = (stop.location as any).coordinates;
    return this.locationService.isPointNearby(
      currentLocation,
      {
        lat: stopLocation[1], // PostGIS stores as [lng, lat]
        lng: stopLocation[0],
      },
      NEARBY_THRESHOLD, // 200 meters threshold
    );
  }

  private getNextShipmentStatus(
    currentStatus: ShipmentStatus,
    stopType: StopType,
    hasBothStopsInRoute: boolean,
  ): ShipmentStatus {
    if (
      stopType === StopType.PICKUP &&
      currentStatus === ShipmentStatus.ROUTE_SET
    ) {
      if (hasBothStopsInRoute) {
        return ShipmentStatus.IN_DELIVERY;
      } else {
        return ShipmentStatus.PICKED_UP;
      }
    } else if (
      stopType === StopType.DELIVERY &&
      currentStatus === ShipmentStatus.PICKED_UP
    ) {
      return ShipmentStatus.IN_DELIVERY;
    }

    return currentStatus;
  }

  async checkAndUpdateDeliveryStop(
    routeId: string,
    shipmentId: string,
  ): Promise<{
    updatedStop: RouteStop;
    updatedShipment: Shipment;
  } | null> {
    // Find the active route with this shipment's delivery stop
    const route = await this.routeRepo.findOne({
      where: {
        status: RouteStatus.ACTIVE,
        id: routeId,
      },
      relations: ['stops', 'stops.shipment'],
    });

    if (!route) {
      return null;
    }

    // Find the delivery stop
    const deliveryStop = route.stops.find(
      (stop) =>
        stop.shipmentId === shipmentId && stop.stopType === StopType.DELIVERY,
    );

    if (!deliveryStop || !deliveryStop.shipment) {
      return null;
    }

    // Check if shipment is marked as delivered in the database
    if (deliveryStop.shipment.status !== ShipmentStatus.DELIVERED) {
      return null;
    }

    // Only update if stop hasn't been marked as completed yet
    if (deliveryStop.actualArrival) {
      return null;
    }

    // Update stop with actual arrival time
    deliveryStop.actualArrival = new Date(); // Use current time as delivery was confirmed
    const updatedStop = await this.routeStopRepository.save(deliveryStop);

    // Create shipment route history record
    await this.shipmentRouteHistoryRepo.save({
      shipment: deliveryStop.shipment,
      route,
      operationType: ShipmentOperationType.DELIVERY,
      assignedAt: route.date,
      completedAt: new Date(),
      isSuccessful: true,
    });

    // Check if this was the last stop and complete route if needed
    const hasMoreStops = route.stops.some(
      (stop) => !stop.actualArrival && stop.stopType !== StopType.END,
    );

    if (!hasMoreStops) {
      // Find and complete END stop if it exists
      const endStop = route.stops.find(
        (stop) => stop.stopType === StopType.END,
      );
      if (endStop) {
        endStop.actualArrival = new Date();
        await this.routeStopRepository.save(endStop);
      }

      // Complete the route
      route.status = RouteStatus.COMPLETED;
      route.completedAt = new Date();
      await this.routeRepo.save(route);
    }

    return {
      updatedStop,
      updatedShipment: deliveryStop.shipment,
    };
  }

  public async getShipmentActiveSegment(
    route: Route,
    shipmentId: string,
    currentLocation: LocationDto,
    showRouteThresholdKm: number = 5, // Show route when carrier is within 5km
  ): Promise<{
    segment?: GeoLineString;
    isPickupRoute: boolean;
    isNearby: boolean;
  } | null> {
    console.log('route', route, shipmentId);
    // Get shipment stops
    const shipmentStops = route.stops
      .filter((stop) => stop.shipment)
      .filter((stop) => stop.shipment.canisterShipmentId === shipmentId)
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex);

    console.log('shipmentStops', shipmentStops);

    const pickupStop = shipmentStops.find(
      (s) => s.stopType === StopType.PICKUP,
    );
    const deliveryStop = shipmentStops.find(
      (s) => s.stopType === StopType.DELIVERY,
    );

    if (!pickupStop || !deliveryStop) {
      return null;
    }

    // Determine active phase
    const isPickupPhase = !pickupStop.actualArrival;
    const targetStop = isPickupPhase ? pickupStop : deliveryStop;

    // Calculate straight-line distance to determine if carrier is nearby
    const targetLocation = targetStop.location as GeoPoint;
    const straightLineDistance = this.calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      targetLocation.coordinates[1],
      targetLocation.coordinates[0],
    );

    const isNearby = straightLineDistance <= showRouteThresholdKm;

    // If not nearby, just return distance/duration without geometry
    if (!isNearby) {
      return {
        isPickupRoute: isPickupPhase,
        isNearby: false,
      };
    }

    // If nearby, calculate actual route
    const allRemainingStops = route.stops
      .filter((stop) => !stop.actualArrival)
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex);

    const stopsUpToTarget = allRemainingStops
      .filter((stop) => stop.sequenceIndex <= targetStop.sequenceIndex)
      .map((stop) => ({
        ...stop,
        shipmentId:
          stop.shipmentId === shipmentId ? stop.shipmentId : undefined,
      }));

    const routeUpdate = await this.routingService.calculateRouteUpdate(
      currentLocation,
      stopsUpToTarget,
    );

    return {
      segment: routeUpdate.routeGeometry,
      isPickupRoute: isPickupPhase,
      isNearby: true,
    };
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

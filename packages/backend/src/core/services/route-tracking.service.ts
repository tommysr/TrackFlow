import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route, RouteStatus } from 'src/routes/entities/route.entity';
import { RouteStop } from 'src/routes/entities/routeStop.entity';
import {
  Shipment,
  ShipmentStatus,
} from 'src/shipments/entities/shipment.entity';

import { LocationService } from '../../common/services/location.service';
import { RoutingService } from './routing.service';
import { ETAService } from './eta.service';
import { RouteDelay } from 'src/routes/entities/route-delay.entity';
import { RouteMetrics } from 'src/routes/entities/route-metrics.entity';
import { ShipmentRouteHistory } from 'src/routes/entities/shipment-route-history.entity';
import { ShipmentOperationType } from 'src/routes/entities/shipment-route-history.entity';
import { StopType } from 'src/routes/types/location.types';
import { UpdateLocationDto } from '../../routes/dto/update-location.dto';
import { LocationDto } from 'src/common/dto/location.dto';

export interface PostGISPoint {
  type: string;
  coordinates: [number, number]; // [longitude, latitude]
}

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
    delays: RouteDelay[];
  }> {
    const route = await this.routeRepo.findOne({
      where: {
        carrier: { principal: carrierId },
        status: RouteStatus.ACTIVE,
      },
      relations: ['stops', 'stops.shipment', 'metrics'],
    });

    console.log('route being updated', route.stops.length);

    if (!route) throw new NotFoundException('No active route found');

    // Update current location
    route.lastLocation = LocationDto.toGeoJSON(location.lng, location.lat);
    route.lastLocationUpdate = new Date(location.timestamp);

    // Check for nearby stops and update statuses
    const { updatedStops: nearbyStops, updatedShipments } =
      await this.checkAndUpdateStops(route, location);

    // Update ETAs and track delays
    const { updatedStops, delays } = await this.etaService.updateETAs(
      route,
      location,
    );

    // Update route metrics and path
    const routeUpdate = await this.routingService.calculateRouteUpdate(
      location,
      route.stops,
    );

    // Update the route path with the new calculated path
    if (routeUpdate.segments.length > 0) {
      const coordinates = routeUpdate.segments.reduce((acc, segment) => {
        return acc.concat(segment.path.coordinates);
      }, []);

      route.fullPath = {
        type: 'LineString',
        coordinates: coordinates,
      };
    }

    // Calculate actual metrics
    const completedStops = route.stops.filter((s) => s.actualArrival).length;
    const totalStops = route.stops.length;
    const completedStopsWithTimes = route.stops
      .filter((s) => s.actualArrival && s.estimatedArrival)
      .map((stop) => ({
        actual: new Date(stop.actualArrival).getTime(),
        estimated: new Date(stop.estimatedArrival).getTime(),
      }));

    // Calculate actual total time and deviation
    let actualTotalTime = 0;
    let totalDeviation = 0;
    if (completedStopsWithTimes.length > 0) {
      const firstStop = completedStopsWithTimes[0];
      const lastStop =
        completedStopsWithTimes[completedStopsWithTimes.length - 1];
      actualTotalTime = (lastStop.actual - firstStop.actual) / (1000 * 60); // Convert to minutes

      completedStopsWithTimes.forEach((stop) => {
        const deviation = (stop.actual - stop.estimated) / (1000 * 60); // Convert to minutes
        totalDeviation += deviation;
      });
    }

    if (!route.metrics) {
      route.metrics = await this.routeMetricsRepo.save({
        route,
        completedStops,
        totalStops,
        completedDistance: route.totalDistance - routeUpdate.remainingDistance,
        remainingDistance: routeUpdate.remainingDistance,
        isDelayed: delays.length > 0,
        delayMinutes: delays.length > 0 ? delays[0].delayMinutes : null,
        actualTotalTime: actualTotalTime > 0 ? actualTotalTime : null,
        deviationFromOptimal: totalDeviation !== 0 ? totalDeviation : null,
      });
    } else {
      route.metrics.completedStops = completedStops;
      route.metrics.totalStops = totalStops;
      route.metrics.completedDistance =
        route.totalDistance - routeUpdate.remainingDistance;
      route.metrics.remainingDistance = routeUpdate.remainingDistance;
      route.metrics.isDelayed = delays.length > 0;
      route.metrics.delayMinutes =
        delays.length > 0 ? delays[0].delayMinutes : null;
      route.metrics.actualTotalTime =
        actualTotalTime > 0 ? actualTotalTime : null;
      route.metrics.deviationFromOptimal =
        totalDeviation !== 0 ? totalDeviation : null;

      route.metrics = await this.routeMetricsRepo.save(route.metrics);
    }

    const updatedRoute = await this.routeRepo.save(route);

    return {
      updatedRoute,
      updatedStops,
      delays,
    };
  }

  private async checkAndUpdateStops(
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

    console.log('uncompletedStops', uncompletedStops.length);

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
      console.log('starting route');
      currentStop.actualArrival = new Date();
      const updatedStop = await this.routeStopRepository.save(currentStop);
      updatedStops.push(updatedStop);
    } else if (
      currentStop.stopType === StopType.PICKUP ||
      currentStop.stopType === StopType.DELIVERY
    ) {
      console.log('checking if near stop', currentStop.stopType);
      if (await this.isNearStop(currentLocation, currentStop)) {
        console.log('near stop');
        currentStop.actualArrival = new Date();
        const updatedStop = await this.routeStopRepository.save(currentStop);
        updatedStops.push(updatedStop);

        // Update shipment status
        if (currentStop.shipment) {
          const newStatus = this.getNextShipmentStatus(
            currentStop.shipment.status,
            currentStop.stopType,
          );
          if (newStatus !== currentStop.shipment.status) {
            currentStop.shipment.status = newStatus;
            const updatedShipment = await this.shipmentRepository.save(
              currentStop.shipment,
            );
            updatedShipments.push(updatedShipment);
          }
        }

        // Update shipment route history
        const history = await this.shipmentRouteHistoryRepo.findOne({
          where: {
            route: { id: route.id },
            shipment: { id: currentStop.shipment?.id },
            operationType:
              currentStop.stopType === StopType.PICKUP
                ? ShipmentOperationType.PICKUP
                : ShipmentOperationType.DELIVERY,
          },
        });
        if (history) {
          history.completedAt = new Date();
          history.isSuccessful = true;
          await this.shipmentRouteHistoryRepo.save(history);
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
      0.2, // 200 meters threshold
    );
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

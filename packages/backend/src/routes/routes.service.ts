import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, Not, Between } from 'typeorm';
import { Route, RouteStatus } from './entities/route.entity';
import { RouteStop } from './entities/routeStop.entity';
import { RouteSegment } from './entities/routeSegment.entity';
import { CreateRouteDto, RouteOperationType } from './dto/create-route.dto';
import {
  RouteOptimizationService,
  OptimizationLocation,
} from './route-optimization.service';
import {
  Shipment,
  ShipmentStatus,
} from '../shipments/entities/shipment.entity';
import { Carrier } from '../carriers/entities/carrier.entity';
import { IcpUser } from '../auth/entities/icp.user.entity';
import { RouteSimulation } from './dto/route-simulation.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { LocationDto } from 'src/common/dto/location.dto';
import { StopType } from './types/location.types';
import { RouteMetrics } from './entities/route-metrics.entity';
import { RouteDistanceMatrix } from './entities/route-distance-matrix.entity';
import {
  ShipmentOperationType,
  ShipmentRouteHistory,
} from './entities/shipment-route-history.entity';
import { RouteWithActivationDto } from './dto/route-with-activation.dto';

interface StopTimeWindow {
  stopType: StopType;
  shipmentId?: string;
  estimatedArrival: Date;
}

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepo: Repository<Route>,
    @InjectRepository(RouteStop)
    private readonly routeStopRepo: Repository<RouteStop>,
    @InjectRepository(RouteSegment)
    private readonly routeSegmentRepo: Repository<RouteSegment>,
    @InjectRepository(Shipment)
    private readonly shipmentRepo: Repository<Shipment>,
    @InjectRepository(Carrier)
    private readonly carrierRepo: Repository<Carrier>,
    @InjectRepository(RouteMetrics)
    private readonly routeMetricsRepo: Repository<RouteMetrics>,
    @InjectRepository(RouteDistanceMatrix)
    private readonly routeDistanceMatrixRepo: Repository<RouteDistanceMatrix>,
    @InjectRepository(ShipmentRouteHistory)
    private readonly shipmentRouteHistoryRepo: Repository<ShipmentRouteHistory>,
    private readonly routeOptimizationService: RouteOptimizationService,
  ) {}

  private async validateShipmentsStatusAndOwnership(
    createRouteDto: CreateRouteDto,
    userPrincipal: string,
  ): Promise<Shipment[]> {
    const shipments = await this.shipmentRepo.find({
      where: {
        canisterShipmentId: In(createRouteDto.shipments.map((s) => s.id)),
      },
      relations: ['carrier', 'pickupAddress', 'deliveryAddress'],
    });

    if (shipments.length !== createRouteDto.shipments.length) {
      throw new BadRequestException('Some shipment ids are not valid');
    }

    const allShipmentsReady = shipments.every((shipment) =>
      this.shipmentReadyToProcess(shipment),
    );

    if (!allShipmentsReady) {
      throw new BadRequestException(
        'Some shipments are not ready for processing',
      );
    }

    const allShipmentsAreOwnedByCarrier = shipments.every(
      (shipment) => shipment.carrier.principal === userPrincipal,
    );

    if (!allShipmentsAreOwnedByCarrier) {
      throw new BadRequestException(
        'Some shipments are not owned by the carrier',
      );
    }

    return shipments;
  }

  private shipmentReadyToProcess(shipment: Shipment): boolean {
    return (
      shipment.pickupWindowStart &&
      shipment.pickupWindowEnd &&
      shipment.deliveryWindowStart &&
      shipment.deliveryWindowEnd &&
      shipment.pickupAddress &&
      shipment.deliveryAddress &&
      shipment.status === ShipmentStatus.BOUGHT
    );
  }

  private collectLocationsWithTypes(
    createRouteDto: CreateRouteDto,
    shipments: Shipment[],
  ): { locations: OptimizationLocation[] } {
    const locations: OptimizationLocation[] = [];

    // Add start location
    locations.push({
      lat: createRouteDto.startLocation.lat,
      lng: createRouteDto.startLocation.lng,
      type: StopType.START,
    });

    // Add shipment locations
    createRouteDto.shipments.forEach((shipmentOp) => {
      const shipment = shipments.find(
        (s) => s.canisterShipmentId.toString() === shipmentOp.id,
      );

      if (!shipment) throw new BadRequestException('Shipment not found');

      if (
        shipmentOp.type === RouteOperationType.BOTH ||
        shipmentOp.type === RouteOperationType.PICKUP
      ) {
        locations.push({
          lat: shipment.pickupAddress.lat,
          lng: shipment.pickupAddress.lng,
          type: StopType.PICKUP,
          shipmentId: shipment.canisterShipmentId,
        });
      }

      if (
        shipmentOp.type === RouteOperationType.BOTH ||
        shipmentOp.type === RouteOperationType.DELIVERY
      ) {
        locations.push({
          lat: shipment.deliveryAddress.lat,
          lng: shipment.deliveryAddress.lng,
          type: StopType.DELIVERY,
          shipmentId: shipment.canisterShipmentId,
        });
      }
    });

    // Add end location if provided
    if (createRouteDto.endLocation) {
      locations.push({
        lat: createRouteDto.endLocation.lat,
        lng: createRouteDto.endLocation.lng,
        type: StopType.END,
      });
    }

    return { locations };
  }

  private calculateStopEstimatedTime(
    startTime: Date,
    segments: { duration: number }[],
    stopIndex: number,
  ): Date {
    const LOADING_TIME = 5 * 60; // 5 minutes
    const startTimeMs = new Date(startTime).getTime();

    console.log('start time', startTime);
    if (stopIndex === 0) return new Date(startTimeMs);

    let cumulativeTime = 0;
    for (let i = 0; i < stopIndex; i++) {
      cumulativeTime += Number(segments[i].duration); // Segment duration in seconds
      cumulativeTime += LOADING_TIME; // Loading time at each stop
    }

    console.log(
      'adding cumulativeTime seconds (',
      cumulativeTime,
      ') to start time',
      startTime.toUTCString(),
    );
    const newTime = new Date(startTimeMs + cumulativeTime * 1000);
    console.log('new time', newTime.toUTCString());
    return newTime;
  }

  private validateWindowsSet(shipments: Shipment[]) {
    for (const shipment of shipments) {
      if (!shipment.pickupWindowStart || !shipment.pickupWindowEnd) {
        throw new BadRequestException(
          `Pickup time for shipment ${shipment.canisterShipmentId} is not set`,
        );
      }

      if (!shipment.deliveryWindowStart || !shipment.deliveryWindowEnd) {
        throw new BadRequestException(
          `Delivery time for shipment ${shipment.canisterShipmentId} is not set`,
        );
      }
    }
  }

  // Simulate route without saving (previously previewRoute)
  async simulateRoute(
    createRouteDto: CreateRouteDto,
    user: IcpUser,
  ): Promise<RouteSimulation> {
    const [shipments, carrier] = await Promise.all([
      this.validateShipmentsStatusAndOwnership(createRouteDto, user.principal),
      this.carrierRepo.findOne({
        where: { principal: user.principal },
        relations: ['configuration'],
      }),
    ]);

    this.validateWindowsSet(shipments);

    if (!carrier) {
      throw new BadRequestException('Carrier not found');
    }

    const { locations } = this.collectLocationsWithTypes(
      createRouteDto,
      shipments,
    );
    const {
      optimizedPoints,
      segments,
      totalTime,
      totalDistance,
      geometry,
      matrix,
    } = await this.routeOptimizationService.optimizeRoute(locations);

    // Map optimized points back to stops
    const stops = optimizedPoints.map((point, index) => {
      return {
        ...(point.type !== StopType.START &&
          point.type !== StopType.END && {
            shipmentId: shipments.find(
              (s) => s.canisterShipmentId === point.shipmentId,
            )?.canisterShipmentId,
          }),
        stopType: point.type,
        sequenceIndex: index,
        location: point,
        estimatedArrival: this.calculateStopEstimatedTime(
          new Date(createRouteDto.estimatedStartTime),
          segments,
          index,
        ),
      };
    });

    await this.validateTimeWindows(shipments, stops);

    return {
      shipments: shipments.map((shipment) => ({
        pickupAddress: shipment.pickupAddress,
        deliveryAddress: shipment.deliveryAddress,
      })),
      stops,
      totalDistance,
      totalFuelCost:
        (totalDistance / carrier.configuration.fuelEfficiency) *
        carrier.configuration.fuelCostPerLiter,
      estimatedTime: totalTime,
      fullPath: geometry,
      distanceMatrix: matrix,
    };
  }

  // Find all routes for a user
  async findAllByUser(user: IcpUser): Promise<RouteWithActivationDto[]> {
    const routes = await this.routeRepo.find({
      where: { carrier: { principal: user.principal } },
      relations: ['carrier', 'stops', 'stops.shipment', 'metrics'],
      order: { date: 'DESC' },
    });

    // Calculate latest activation time for pending routes
    return routes.map((route) => {
      const latestActivationTime = this.calculateLatestActivationTime(route);
      return {
        route,
        latestActivationTime,
      };
    });
  }

  private calculateLatestActivationTime(route: Route): Date | null {
    if (!route.stops?.length) return null;

    const stopsWithWindows = route.stops
      .filter((stop) => stop.shipment)
      .map((stop) => {
        // Calculate cumulative duration to this stop using actual stop ETAs
        const durationToStop =
          (new Date(stop.estimatedArrival).getTime() -
            new Date(route.date).getTime()) /
          1000;

        return {
          stop,
          durationToStop, // Duration in seconds from route start to this stop
          windowEnd:
            stop.stopType === StopType.PICKUP
              ? stop.shipment.pickupWindowEnd
              : stop.shipment.deliveryWindowEnd,
        };
      });

    if (!stopsWithWindows.length) return null;

    // Find the most constraining time window
    const latestPossibleStart = Math.min(
      ...stopsWithWindows.map(
        ({ windowEnd, durationToStop }) =>
          new Date(windowEnd).getTime() - durationToStop * 1000,
      ),
    );

    return new Date(latestPossibleStart);
  }

  // Find specific route for a user
  async findOneByUser(id: string, user: IcpUser): Promise<Route> {
    const route = await this.routeRepo.findOne({
      where: { id, carrier: { principal: user.principal } },
      relations: ['carrier', 'stops', 'stops.shipment'],
    });

    if (!route) {
      throw new NotFoundException(`Route #${id} not found`);
    }

    return route;
  }

  // Delete route
  async remove(id: string, user: IcpUser): Promise<void> {
    const route = await this.findOneByUser(id, user);

    if (route.status === RouteStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete an active route');
    }

    await this.routeRepo.remove(route);
  }

  private async validateRouteConstraints(
    carrierId: string,
    createRouteDto: CreateRouteDto,
    shipments: Shipment[],
    totalTimeInSeconds: number,
  ): Promise<void> {
    const startTime = new Date(createRouteDto.estimatedStartTime);
    const endTime = new Date(startTime.getTime() + totalTimeInSeconds * 1000);

    const existingRoutes = await this.routeRepo.find({
      where: {
        carrier: { principal: carrierId },
        status: Not(In([RouteStatus.COMPLETED, RouteStatus.CANCELLED])),
        date: Between(startTime, endTime),
      },
      relations: ['stops', 'stops.shipment'],
    });

    const overlappingShipments = existingRoutes
      .flatMap((route) => route.stops)
      .filter((stop) => stop.shipment) // Filter out stops without shipments (START/END)
      .map((stop) => stop.shipment?.canisterShipmentId)
      .filter(Boolean); // Remove any undefined/null values

    const activeShipments = await this.shipmentRepo.find({
      where: {
        canisterShipmentId: In(shipments.map((s) => s.canisterShipmentId)),
        status: In([
          ShipmentStatus.PICKED_UP, // Only consider shipments that are physically being handled
          ShipmentStatus.IN_DELIVERY, // Or are already in transit
        ]),
      },
    });

    if (activeShipments.length > 0) {
      throw new BadRequestException(
        `Shipments ${activeShipments.map((s) => s.canisterShipmentId).join(', ')} are currently in active delivery`,
      );
    }

    const hasOverlap = shipments.some((shipment) =>
      overlappingShipments.includes(shipment.canisterShipmentId),
    );

    if (hasOverlap) {
      throw new BadRequestException(
        'Some shipments are already assigned to routes in this time window',
      );
    }
  }

  async createOptimizedRoute(
    createRouteDto: CreateRouteDto,
    user: IcpUser,
  ): Promise<string> {
    console.log(
      'type of createRouteDto',
      typeof createRouteDto.estimatedStartTime,
    );

    const [shipments, carrier] = await Promise.all([
      this.validateShipmentsStatusAndOwnership(createRouteDto, user.principal),
      this.carrierRepo.findOne({
        where: { principal: user.principal },
        relations: ['configuration'],
      }),
    ]);

    if (!carrier) {
      throw new BadRequestException('Carrier not found');
    }

    this.validateWindowsSet(shipments);

    const { locations } = this.collectLocationsWithTypes(
      createRouteDto,
      shipments,
    );

    const {
      optimizedPoints,
      totalDistance,
      totalTime,
      segments,
      matrix,
      geometry,
    } = await this.routeOptimizationService.optimizeRoute(locations);

    await this.validateRouteConstraints(
      carrier.principal,
      createRouteDto,
      shipments,
      totalTime,
    );

    const preliminaryStops = optimizedPoints.map((point, index) => ({
      stopType: point.type,
      sequenceIndex: index,
      shipmentId: point.shipmentId,
      estimatedArrival: this.calculateStopEstimatedTime(
        new Date(createRouteDto.estimatedStartTime),
        segments,
        index,
      ),
    }));
    await this.validateTimeWindows(shipments, preliminaryStops);

    const fuelConsumption =
      totalDistance / carrier.configuration.fuelEfficiency;
    const totalFuelCost =
      fuelConsumption * carrier.configuration.fuelCostPerLiter;

    const route = this.routeRepo.create({
      carrier,
      totalDistance,
      totalFuelCost,
      fuelConsumption,
      estimatedTime: totalTime,
      date: new Date(createRouteDto.estimatedStartTime),
      status: RouteStatus.PENDING,
      stops: [],
      fullPath: geometry
        ? {
            type: 'LineString',
            coordinates: geometry.coordinates,
          }
        : undefined,
    });

    const routeMetrics = this.routeMetricsRepo.create({
      completedStops: 0,
      totalStops: optimizedPoints.length,
      completedDistance: 0,
      remainingDistance: totalDistance,
      isDelayed: false,
      delayMinutes: 0,
    });

    const routeDistanceMatrix = this.routeDistanceMatrixRepo.create({
      durations: matrix.durations,
      distances: matrix.distances,
    });

    // Save route first
    const savedRoute = await this.routeRepo.save(route);

    routeMetrics.route = savedRoute;
    routeDistanceMatrix.route = savedRoute;

    const savedMetrics = await this.routeMetricsRepo.save(routeMetrics);
    const savedMatrix =
      await this.routeDistanceMatrixRepo.save(routeDistanceMatrix);

    savedRoute.metrics = savedMetrics;
    savedRoute.distanceMatrix = savedMatrix;

    const routeStops = await Promise.all(
      optimizedPoints.map(async (point, index) => {
        const estimatedTime = this.calculateStopEstimatedTime(
          new Date(savedRoute.date),
          segments,
          index,
        );

        const routeStopData = {
          route: savedRoute,
          stopType: point.type,
          sequenceIndex: index,
          location: {
            type: 'Point',
            coordinates: [point.lng, point.lat],
          },
          estimatedArrival: estimatedTime,
        };

        if (point.type !== StopType.START && point.type !== StopType.END) {
          const shipment = shipments.find(
            (s) => s.canisterShipmentId === point.shipmentId,
          );

          Object.assign(routeStopData, {
            shipment,
            shipmentId: shipment.canisterShipmentId,
          });

          // Update shipment status to ROUTE_SET
          shipment.status = ShipmentStatus.ROUTE_SET;
          await this.shipmentRepo.save(shipment);

          // Create shipment route history record
          await this.shipmentRouteHistoryRepo.save({
            shipment,
            route: savedRoute,
            operationType:
              point.type === StopType.PICKUP
                ? ShipmentOperationType.PICKUP
                : ShipmentOperationType.DELIVERY,
            assignedAt: new Date(),
            isSuccessful: false, // Will be updated when operation is completed
          });
        }

        return await this.routeStopRepo.save(routeStopData);
      }),
    );

    if (segments) {
      await Promise.all(
        segments.map(async (segment, index) => {
          if (index < routeStops.length - 1) {
            await this.routeSegmentRepo.save({
              route: savedRoute,
              fromStop: routeStops[index],
              toStop: routeStops[index + 1],
              path: {
                type: 'LineString',
                coordinates: segment.geometry.coordinates,
              },
              distance: segment.distance,
              duration: segment.duration,
              estimatedStartTime: routeStops[index]?.estimatedArrival,
              estimatedEndTime: routeStops[index + 1]?.estimatedArrival,
            });
          }
        }),
      );
    }

    return savedRoute.id;
  }

  private async validateTimeWindows(
    shipments: Shipment[],
    stops: StopTimeWindow[],
  ): Promise<void> {
    for (const stop of stops) {
      if (!stop.shipmentId) continue;
      const shipment = shipments.find(
        (s) => s.canisterShipmentId === stop.shipmentId,
      );

      if (stop.stopType === 'PICKUP') {
        if (!shipment.pickupWindowStart || !shipment.pickupWindowEnd) {
          throw new BadRequestException(
            `Pickup time for shipment ${stop.shipmentId} is not set`,
          );
        }

        if (
          stop.estimatedArrival < shipment.pickupWindowStart ||
          stop.estimatedArrival > shipment.pickupWindowEnd
        ) {
          throw new BadRequestException(
            `Pickup time for shipment ${stop.shipmentId} outside allowed window`,
          );
        }
      }

      if (stop.stopType === 'DELIVERY') {
        if (!shipment.deliveryWindowStart || !shipment.deliveryWindowEnd) {
          throw new BadRequestException(
            `Delivery time for shipment ${stop.shipmentId} is not set`,
          );
        }

        if (
          stop.estimatedArrival < shipment.deliveryWindowStart ||
          stop.estimatedArrival > shipment.deliveryWindowEnd
        ) {
          throw new BadRequestException(
            `Delivery time for shipment ${stop.shipmentId} outside allowed window`,
          );
        }
      }
    }
  }

  async recalculateRouteTimes(route: Route, currentTime: Date) {
    console.log('recalculating route times', route.segments);
    route.stops = route.stops
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
      .map((stop, index) => ({
        ...stop,
        estimatedArrival: this.calculateStopEstimatedTime(
          currentTime,
          route.segments,
          index,
        ),
      }));

    return route;
  }

  async validateRouteStops(route: Route) {
    for (const stop of route.stops) {
      if (!stop.shipment) continue;

      if (
        stop.stopType === StopType.PICKUP &&
        (stop.estimatedArrival < stop.shipment.pickupWindowStart ||
          stop.estimatedArrival > stop.shipment.pickupWindowEnd)
      ) {
        throw new BadRequestException(
          `Pickup time for shipment ${stop.shipment.canisterShipmentId} would fall outside allowed window if activated now`,
        );
      }

      if (
        stop.stopType === StopType.DELIVERY &&
        (stop.estimatedArrival < stop.shipment.deliveryWindowStart ||
          stop.estimatedArrival > stop.shipment.deliveryWindowEnd)
      ) {
        throw new BadRequestException(
          `Delivery time for shipment ${stop.shipment.canisterShipmentId} would fall outside allowed window if activated now`,
        );
      }
    }
  }

  async activateRoute(
    routeId: string,
    userPrincipal: string,
  ): Promise<RouteStatus> {
    const route = await this.routeRepo.findOne({
      where: { id: routeId, carrier: { principal: userPrincipal } },
      relations: ['stops', 'stops.shipment', 'segments'],
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    if (route.status !== RouteStatus.PENDING) {
      throw new BadRequestException(
        'Route must be in PENDING status to activate',
      );
    }

    // Check if carrier already has an active route
    const activeRoute = await this.routeRepo.findOne({
      where: {
        carrier: { principal: userPrincipal },
        status: RouteStatus.ACTIVE,
      },
      relations: ['stops', 'stops.shipment', 'segments'],
    });

    if (activeRoute) {
      throw new BadRequestException('Carrier already has an active route');
    }

    const currentTime = new Date();

    // Recalculate all ETAs based on current time
    const updatedRoute = await this.recalculateRouteTimes(route, currentTime);
    await this.validateRouteStops(updatedRoute);

    // Update route status and times
    updatedRoute.status = RouteStatus.ACTIVE;
    updatedRoute.startedAt = currentTime;
    updatedRoute.date = currentTime;

    await this.routeRepo.save(updatedRoute);

    return RouteStatus.ACTIVE;
  }

  async getActiveRoute(userPrincipal: string): Promise<Route> {
    const route = await this.routeRepo.findOne({
      where: {
        carrier: { principal: userPrincipal },
        status: RouteStatus.ACTIVE,
      },
      relations: ['stops', 'stops.shipment'],
      order: {
        stops: {
          sequenceIndex: 'ASC',
        },
      },
    });

    if (!route) {
      throw new NotFoundException('No active route found');
    }

    return route;
  }

  async getActiveRouteMetrics(userPrincipal: string) {
    const route = await this.routeRepo.findOne({
      where: {
        carrier: { principal: userPrincipal },
        status: RouteStatus.ACTIVE,
      },
      relations: ['stops', 'metrics', 'stops.shipment'],
      order: {
        stops: {
          sequenceIndex: 'ASC',
        },
      },
    });

    if (!route) {
      throw new NotFoundException('No active route found');
    }

    const nextStop = route.stops
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
      .find((stop) => !stop.actualArrival);
    const remainingStops = route.stops.filter(
      (stop) => !stop.actualArrival && stop.id !== nextStop?.id,
    );

    return {
      route,
      metrics: route.metrics,
      nextStop,
      remainingStops,
    };
  }

  async getRouteProgress(userPrincipal: string) {
    const route = await this.routeRepo.findOne({
      where: {
        carrier: { principal: userPrincipal },
        status: RouteStatus.ACTIVE,
      },
      relations: ['metrics', 'stops'],
    });

    if (!route) {
      throw new NotFoundException('No active route found');
    }

    const nextStop = route.stops
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
      .find((stop) => !stop.actualArrival);

    return {
      completedStops: route.metrics.completedStops,
      totalStops: route.metrics.totalStops,
      completedDistance: route.metrics.completedDistance,
      remainingDistance: route.metrics.remainingDistance,
      isDelayed: route.metrics.isDelayed,
      delayMinutes: route.metrics.delayMinutes,
      nextStopEta: nextStop?.estimatedArrival,
    };
  }
}

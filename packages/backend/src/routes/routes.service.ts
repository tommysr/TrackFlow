import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Route, RouteStatus } from './entities/route.entity';
import { RouteStop } from './entities/routeStop.entity';
import { RouteSegment } from './entities/routeSegment.entity';
import { CreateRouteDto, RouteOperationType } from './dto/create-route.dto';
import { RouteOptimizationService, Location } from './route-optimization.service';
import { Shipment, ShipmentStatus } from '../shipments/entities/shipment.entity';
import { Carrier } from '../carriers/entities/carrier.entity';
import { IcpUser } from '../auth/entities/icp.user.entity';
import { RouteSimulation } from './dto/route-simulation.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

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
    private readonly routeOptimizationService: RouteOptimizationService,
  ) {}

  async createOptimizedRoute(
    createRouteDto: CreateRouteDto,
    user: IcpUser,
  ): Promise<Route> {
    // 1. Validate shipments and carrier
    const [shipments, carrier] = await Promise.all([
      this.validateShipmentsStatusAndOwnership(createRouteDto, user.principal),
      this.carrierRepo.findOneBy({ principal: user.principal }),
    ]);

    if (!carrier) {
      throw new BadRequestException('Carrier not found');
    }

    // 2. Collect locations and optimize route
    const { locations } = this.collectLocationsWithTypes(createRouteDto, shipments);
    const {
      optimizedPoints,
      totalDistance,
      totalTime,
      segments,
      matrix,
      geometry,
    } = await this.routeOptimizationService.optimizeRoute(locations);

    // 3. Calculate route costs
    const fuelConsumption = totalDistance / carrier.fuelEfficiency;
    const totalFuelCost = fuelConsumption * carrier.fuelCostPerLiter;

    // 4. Create and save route entity
    const route = this.routeRepo.create({
      carrier,
      totalDistance,
      totalFuelCost,
      fuelConsumption,
      estimatedTime: totalTime,
      date: createRouteDto.estimatedStartTime,
      status: RouteStatus.PENDING,
      fullPath: geometry ? {
        type: 'LineString',
        coordinates: geometry.coordinates,
      } : undefined,
      distanceMatrix: matrix,
      metrics: {
        progress: {
          completedStops: 0,
          totalStops: optimizedPoints.length,
          completedDistance: 0,
          remainingDistance: totalDistance,
          isDelayed: false
        }
      }
    });

    const savedRoute = await this.routeRepo.save(route);

    // 5. Create route stops for each optimized point
    const routeStops = await Promise.all(
      optimizedPoints.map(async (point, index) => {
        const shipment = shipments.find(s => s.canisterShipmentId === point.shipmentId);
        const estimatedTime = this.calculateStopEstimatedTime(savedRoute.date, savedRoute.distanceMatrix.durations, index);
        
        const routeStop = await this.routeStopRepo.save({
          route: savedRoute,
          shipment,
          shipmentId: shipment.canisterShipmentId,
          stopType: point.type === 'pickup' ? 'PICKUP' : 'DELIVERY',
          sequenceIndex: index,
          location: {
            type: 'Point',
            coordinates: [point.lng, point.lat]
          },
          estimatedArrival: estimatedTime
        });

        return routeStop;
      })
    );

    // 6. Create route segments between consecutive stops
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
                coordinates: segment.geometry.coordinates
              },
              distance: segment.distance,
              duration: segment.duration,
              estimatedStartTime: routeStops[index]?.estimatedArrival,
              estimatedEndTime: routeStops[index + 1]?.estimatedArrival
            });
          }
        })
      );
    }

    return savedRoute;
  }

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
      throw new BadRequestException('Some shipments are not ready for processing');
    }

    const allShipmentsAreOwnedByCarrier = shipments.every(
      (shipment) => shipment.carrier.principal === userPrincipal,
    );

    if (!allShipmentsAreOwnedByCarrier) {
      throw new BadRequestException('Some shipments are not owned by the carrier');
    }

    return shipments;
  }

  private shipmentReadyToProcess(shipment: Shipment): boolean {
    return (
      shipment.status === ShipmentStatus.READY_FOR_PICKUP ||
      shipment.status === ShipmentStatus.IN_TRANSIT ||
      shipment.status === ShipmentStatus.BOUGHT_WITH_ADDRESS
    );
  }

  private collectLocationsWithTypes(
    createRouteDto: CreateRouteDto,
    shipments: Shipment[],
  ): { locations: Location[] } {
    const locations: Location[] = [];

    createRouteDto.shipments.forEach((shipmentOp) => {
      const shipment = shipments.find(
        (s) => Number(s.canisterShipmentId) === shipmentOp.id,
      );

      if (!shipment) return;

      if (
        shipmentOp.type === RouteOperationType.BOTH ||
        shipmentOp.type === RouteOperationType.PICKUP
      ) {
        locations.push({
          lat: shipment.pickupAddress.latitude,
          lng: shipment.pickupAddress.longitude,
          type: 'pickup',
          shipmentId: shipment.canisterShipmentId,
        });
      }

      if (
        shipmentOp.type === RouteOperationType.BOTH ||
        shipmentOp.type === RouteOperationType.DELIVERY
      ) {
        locations.push({
          lat: shipment.deliveryAddress.latitude,
          lng: shipment.deliveryAddress.longitude,
          type: 'delivery',
          shipmentId: shipment.canisterShipmentId,
        });
      }
    });

    return { locations };
  }

  private calculateStopEstimatedTime(
    startTime: Date,
    durations: number[][],
    stopIndex: number
  ): Date {
    const LOADING_TIME = 15 * 60; // 15 minutes in seconds
    const startTimeMs = new Date(startTime).getTime();
    
    if (stopIndex === 0) return new Date(startTimeMs);
    
    let cumulativeDuration = 0;
    for (let i = 0; i < stopIndex; i++) {
      cumulativeDuration += durations[i][i + 1] + LOADING_TIME;
    }
    
    return new Date(startTimeMs + (cumulativeDuration * 1000));
  }

  // Simulate route without saving (previously previewRoute)
  async simulateRoute(
    createRouteDto: CreateRouteDto,
    user: IcpUser,
  ): Promise<RouteSimulation> {
    const [shipments, carrier] = await Promise.all([
      this.validateShipmentsStatusAndOwnership(createRouteDto, user.principal),
      this.carrierRepo.findOneBy({ principal: user.principal }),
    ]);

    if (!carrier) {
      throw new BadRequestException('Carrier not found');
    }

    const { locations } = this.collectLocationsWithTypes(createRouteDto, shipments);
    const optimizationResult = await this.routeOptimizationService.optimizeRoute(locations);

    // Create optimized points array with sequence information
    const { optimizedPoints } = optimizationResult;
    
    // Map optimized points back to stops
    const stops = optimizedPoints.map((point, index) => {
      const shipment = shipments.find(s => s.canisterShipmentId === point.shipmentId);
      return {
        shipmentId: shipment.canisterShipmentId,
        stopType: point.type === 'pickup' ? ('PICKUP' as const) : ('DELIVERY' as const),
        sequenceIndex: index,
        location: {
          type: 'Point' as const,
          coordinates: [point.lng, point.lat] as [number, number]
        },
        estimatedArrival: this.calculateStopEstimatedTime(
          createRouteDto.estimatedStartTime,
          optimizationResult.matrix?.durations || [],
          index
        )
      };
    });

    return {
      shipments: shipments.map(shipment => ({
        pickupAddress: shipment.pickupAddress,
        deliveryAddress: shipment.deliveryAddress
      })),
      stops,
      totalDistance: optimizationResult.totalDistance,
      totalFuelCost: (optimizationResult.totalDistance / carrier.fuelEfficiency) * carrier.fuelCostPerLiter,
      estimatedTime: optimizationResult.totalTime,
      fullPath: optimizationResult.geometry ? {
        type: 'LineString' as const,
        coordinates: optimizationResult.geometry.coordinates,
      } : undefined,
      distanceMatrix: optimizationResult.matrix,
    };
  }

  // Find all routes for a user
  async findAllByUser(user: IcpUser): Promise<Route[]> {
    return this.routeRepo.find({
      where: { carrier: { principal: user.principal } },
      relations: ['carrier'],
      order: { date: 'DESC' }
    });
  }

  // Find specific route for a user
  async findOneByUser(id: string, user: IcpUser): Promise<Route> {
    const route = await this.routeRepo.findOne({
      where: { id, carrier: { principal: user.principal } },
      relations: ['carrier', 'stops', 'stops.shipment']
    });

    if (!route) {
      throw new NotFoundException(`Route #${id} not found`);
    }

    return route;
  }

  // Update route (mainly status updates)
  async update(
    id: string, 
    updateRouteDto: UpdateRouteDto,
    user: IcpUser
  ): Promise<Route> {
    const route = await this.findOneByUser(id, user);
    
    // Validate status transition
    if (updateRouteDto.status) {
      this.validateStatusTransition(route.status, updateRouteDto.status);
    }

    Object.assign(route, updateRouteDto);
    return this.routeRepo.save(route);
  }

  // Delete route
  async remove(id: string, user: IcpUser): Promise<void> {
    const route = await this.findOneByUser(id, user);
    await this.routeRepo.remove(route);
  }

  private validateStatusTransition(currentStatus: RouteStatus, newStatus: RouteStatus) {
    const validTransitions = {
      [RouteStatus.PENDING]: [RouteStatus.ACTIVE, RouteStatus.CANCELLED],
      [RouteStatus.ACTIVE]: [RouteStatus.COMPLETED, RouteStatus.CANCELLED],
      [RouteStatus.COMPLETED]: [],
      [RouteStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`
      );
    }
  }
}

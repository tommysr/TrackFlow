import { Injectable, BadRequestException } from '@nestjs/common';
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
        const estimatedTime = this.calculateStopEstimatedTime(savedRoute, index);
        
        const routeStop = await this.routeStopRepo.save({
          route: savedRoute,
          shipment,
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

  private calculateStopEstimatedTime(route: Route, stopIndex: number): Date {
    const startTime = new Date(route.date);
    const LOADING_TIME = 15 * 60 * 1000; // 15 minutes for loading/unloading
    
    if (stopIndex === 0) {
      return startTime;
    }

    // Calculate cumulative duration by summing consecutive segments
    let cumulativeDuration = 0;
    for (let i = 0; i < stopIndex; i++) {
      // Get duration from point i to point i+1
      const segmentDuration = route.distanceMatrix.durations[i][i + 1];
      cumulativeDuration += segmentDuration * 1000; // Convert seconds to ms
    }
    
    // Add loading/unloading time for each previous stop
    const totalLoadingTime = stopIndex * LOADING_TIME;
    
    return new Date(startTime.getTime() + cumulativeDuration + totalLoadingTime);
  }

  async previewRoute(
    createRouteDto: CreateRouteDto,
    user: IcpUser,
  ): Promise<Route> {
    const [shipments, carrier] = await Promise.all([
      this.validateShipmentsStatusAndOwnership(createRouteDto, user.principal),
      this.carrierRepo.findOneBy({ principal: user.principal }),
    ]);

    if (!carrier) {
      throw new BadRequestException('Carrier not found');
    }

    const { locations } = this.collectLocationsWithTypes(createRouteDto, shipments);
    const optimizationResult = await this.routeOptimizationService.optimizeRoute(locations);

    // Create a preview route without saving to database
    return this.routeRepo.create({
      carrier,
      totalDistance: optimizationResult.totalDistance,
      totalFuelCost: (optimizationResult.totalDistance / carrier.fuelEfficiency) * carrier.fuelCostPerLiter,
      fuelConsumption: optimizationResult.totalDistance / carrier.fuelEfficiency,
      estimatedTime: optimizationResult.totalTime,
      date: createRouteDto.estimatedStartTime,
      status: RouteStatus.PENDING,
      fullPath: optimizationResult.geometry ? {
        type: 'LineString',
        coordinates: optimizationResult.geometry.coordinates,
      } : undefined,
    });
  }
}

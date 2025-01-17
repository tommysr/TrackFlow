import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Route } from '../aggregation/entities/route.entity';
import { CreateRouteDto, RouteOperationType } from './dto/create-route.dto';
import {
  RouteOptimizationService,
  Location,
} from './route-optimization.service';
import {
  Shipment,
  ShipmentStatus,
} from '../shipments/entities/shipment.entity';
import { Carrier } from '../carriers/entities/carrier.entity';
import { IcpUser } from '../auth/entities/icp.user.entity';
import { LocationService } from '../common/services/location.service';

export interface RouteProgress {
  completedStops: number;
  remainingStops: number;
  completedDistance: number;
  remainingDistance: number;
  isDelayed: boolean;
  estimatedDelay?: number;
  currentSpeed?: number;
  estimatedArrivalTime?: Date;
}

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @InjectRepository(Carrier)
    private readonly carrierRepository: Repository<Carrier>,
    private readonly routeOptimizationService: RouteOptimizationService,
    private readonly locationService: LocationService,
  ) {}

  async previewRoute(
    createRouteDto: CreateRouteDto,
    user: IcpUser,
  ): Promise<Route> {
    return this.calculateRoute(createRouteDto, user.principal);
  }

  async createOptimizedRoute(
    createRouteDto: CreateRouteDto,
    user: IcpUser,
  ): Promise<Route> {
    const route = await this.calculateRoute(createRouteDto, user.principal);

    const savedRoute = await this.routeRepository.save(route);

    // Update shipments with calculated times and route association
    await Promise.all(
      route.shipments.map(async (shipment, index) => {
        const estimatedTimes = this.calculateEstimatedTimes(route, index);

        shipment.route = savedRoute;
        shipment.estimatedPickupTime = estimatedTimes.pickup;
        shipment.estimatedDeliveryTime = estimatedTimes.delivery;

        return this.shipmentRepository.save(shipment);
      }),
    );

    return savedRoute;
  }

  private async validateShipmentsStatusAndOwnership(
    createRouteDto: CreateRouteDto,
    userPrincipal: string,
  ): Promise<Shipment[]> {
    const shipments = await this.shipmentRepository.find({
      where: {
        canisterShipmentId: In(createRouteDto.shipments.map((s) => s.id)),
      },
      relations: ['assignedCarrier', 'pickupAddress', 'deliveryAddress'],
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
      (shipment) => shipment.assignedCarrier.identityId === userPrincipal,
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
      shipment.status === ShipmentStatus.READY_FOR_PICKUP ||
      shipment.status === ShipmentStatus.IN_TRANSIT ||
      shipment.status === ShipmentStatus.BOUGHT_WITH_ADDRESS
    );
  }

  private async calculateRoute(
    createRouteDto: CreateRouteDto,
    userPrincipal: string,
  ): Promise<Route> {
    const shipments = await this.validateShipmentsStatusAndOwnership(
      createRouteDto,
      userPrincipal,
    );

    const carrier = await this.carrierRepository.findOne({
      where: { identity: { principal: userPrincipal } },
    });

    if (!carrier) {
      throw new BadRequestException('Carrier not found');
    }

    // Collect all locations and their types (pickup/delivery)
    const { locations } = this.collectLocationsWithTypes(
      createRouteDto,
      shipments,
    );

    // Get optimized route with matrix
    const {
      optimizedPoints,
      totalDistance,
      totalTime,
      segments,
      matrix,
      geometry,
    } = await this.routeOptimizationService.optimizeRoute(locations);

    // Calculate costs
    const fuelEfficiency = carrier.fuelEfficiency || 10; // km/L
    const fuelCostPerLiter = carrier.fuelCostPerLiter || 1.5; // currency/L
    const fuelConsumption = totalDistance / fuelEfficiency;
    const totalFuelCost = fuelConsumption * fuelCostPerLiter;

    const route = this.routeRepository.create({
      carrier,
      optimizedPoints,
      segments,
      distanceMatrix: matrix,
      totalDistance,
      totalFuelCost,
      estimatedTime: totalTime,
      date: new Date(),
      shipments,
      fuelConsumption,
      isCompleted: false,
      metrics: {
        progress: {
          completedStops: 0,
          totalStops: locations.length,
          completedDistance: 0,
          remainingDistance: totalDistance,
          isDelayed: false,
        },
      },
      geometry,
    });

    return route;
  }

  private calculateEstimatedTimes(
    route: Route,
    shipmentIndex: number,
  ): {
    pickup: Date;
    delivery: Date;
  } {
    const startTime = new Date(route.date);
    let currentTime = startTime.getTime();

    const pickupIndex = route.segments.findIndex((s) =>
      s.steps.some((step) => step.way_points[0] === shipmentIndex * 2),
    );
    const deliveryIndex = route.segments.findIndex((s) =>
      s.steps.some((step) => step.way_points[0] === shipmentIndex * 2 + 1),
    );

    // Calculate time to pickup
    for (let i = 0; i < pickupIndex; i++) {
      currentTime += route.segments[i].duration * 1000;
    }

    const pickupTime = new Date(currentTime);

    // Calculate time to delivery
    for (let i = pickupIndex; i < deliveryIndex; i++) {
      currentTime += route.segments[i].duration * 1000;
    }

    const deliveryTime = new Date(currentTime);

    return { pickup: pickupTime, delivery: deliveryTime };
  }

  private collectLocationsWithTypes(
    createRouteDto: CreateRouteDto,
    shipments: Shipment[],
  ): {
    locations: Location[];
  } {
    const locations: Location[] = [];

    createRouteDto.shipments.forEach((shipmentOp, index) => {
      // TODO: This is a hack to get the shipment by id. We should use the shipment id directly.
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
}

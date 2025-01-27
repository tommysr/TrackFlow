import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { Shipment, ShipmentStatus } from './entities/shipment.entity';
import {
  BaseShipmentResponseDto,
  BoughtShipmentResponseDto,
  GeocodeResponseDto,
  PendingShipmentResponseDto,
} from './dto/shipment-response.dto';
import { ShipmentsSyncService } from './shipments-sync.service';
import { GeocodeAddressDto, SetAddressDto } from './dto/create-shipment.dto';
import { geocodeAddress } from '../utils/geocode.util';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Address } from './entities/address.entity';
import { RouteStop } from '../routes/entities/routeStop.entity';
import { RouteStatus } from '../routes/entities/route.entity';
import { AddressLocationResponseDto } from './dto/address-location.dto';
import { ShipmentWindowsDto } from './dto/time-window.dto';
import { PublicShipmentTrackingDto } from './dto/public-shipment-tracking.dto';
import { RouteTrackingService } from '../core/services/route-tracking.service';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);
  private readonly geocodingApiKey: string;
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    private readonly syncService: ShipmentsSyncService,
    private readonly configService: ConfigService,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
    @InjectRepository(RouteStop)
    private readonly routeStopRepo: Repository<RouteStop>,
    private readonly routeTrackingService: RouteTrackingService,
  ) {
    this.geocodingApiKey = this.configService.get('routing.apiKey');
  }

  async findOneById(canisterShipmentId: string): Promise<Shipment> {
    this.logger.log(`Finding shipment with ID: ${canisterShipmentId}`);
    const shipment = await this.shipmentRepository.findOne({
      where: { canisterShipmentId },
      relations: ['shipper', 'carrier', 'pickupAddress', 'deliveryAddress'],
    });

    console.log(`Shipment found: ${shipment?.canisterShipmentId}`);

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    return shipment;
  }

  async findByCarrier(principal: string): Promise<Shipment[]> {
    return this.shipmentRepository.find({
      where: { carrier: { principal } },
      relations: ['locations', 'carrier'],
    });
  }

  async getTimeWindows(
    canisterShipmentId: string,
  ): Promise<ShipmentWindowsDto> {
    const shipment = await this.findOneById(canisterShipmentId);
    return {
      pickup:
        shipment.pickupWindowStart && shipment.pickupWindowEnd
          ? {
              start: shipment.pickupWindowStart,
              end: shipment.pickupWindowEnd,
            }
          : undefined,
      delivery:
        shipment.deliveryWindowStart && shipment.deliveryWindowEnd
          ? {
              start: shipment.deliveryWindowStart,
              end: shipment.deliveryWindowEnd,
            }
          : undefined,
    };
  }

  async getAddresses(canisterShipmentId: string): Promise<GeocodeResponseDto> {
    const shipment = await this.findOneById(canisterShipmentId);

    if (!shipment.pickupAddress || !shipment.deliveryAddress) {
      throw new NotFoundException(
        'Shipment does not have pickup or delivery addresses',
      );
    }

    return {
      pickup: this.toAddressResponse(shipment.pickupAddress),
      delivery: this.toAddressResponse(shipment.deliveryAddress),
    };
  }

  async geocodeAddress(
    geocodeAddressDto: GeocodeAddressDto,
  ): Promise<GeocodeResponseDto> {
    const [geocodedPickupAddress, geocodedDeliveryAddress] = await Promise.all([
      geocodeAddress(geocodeAddressDto.pickupAddress, this.geocodingApiKey),
      geocodeAddress(geocodeAddressDto.deliveryAddress, this.geocodingApiKey),
    ]);

    return {
      pickup: {
        lat: geocodedPickupAddress.latitude,
        lng: geocodedPickupAddress.longitude,
        address: {
          street: geocodeAddressDto.pickupAddress.street,
          city: geocodeAddressDto.pickupAddress.city,
          zip: geocodeAddressDto.pickupAddress.zip,
          country: geocodeAddressDto.pickupAddress.country,
        },
      },
      delivery: {
        lat: geocodedDeliveryAddress.latitude,
        lng: geocodedDeliveryAddress.longitude,
        address: {
          street: geocodeAddressDto.deliveryAddress.street,
          city: geocodeAddressDto.deliveryAddress.city,
          zip: geocodeAddressDto.deliveryAddress.zip,
          country: geocodeAddressDto.deliveryAddress.country,
        },
      },
    };
  }

  // Modified createShipment to handle sync properly
  async setAddress(
    id: string,
    setAddressDto: SetAddressDto,
  ): Promise<{ trackingToken: string }> {
    const shipment = await this.findOneById(id);

    if (!shipment) {
      throw new NotFoundException('Shipment not found on ICP');
    }

    if (shipment.status == ShipmentStatus.ROUTE_SET) {
      throw new BadRequestException('Shipment addresses cant be changed');
    }

    // Create pickup address
    const pickupAddress = this.addressRepository.create({
      ...setAddressDto.pickupAddress,
    });

    // Create delivery address
    const deliveryAddress = this.addressRepository.create({
      ...setAddressDto.deliveryAddress,
    });

    // Generate tracking token (24 hour validity)
    const trackingToken = this.generateTrackingToken(
      shipment.canisterShipmentId,
    );

    shipment.pickupAddress = pickupAddress;
    shipment.deliveryAddress = deliveryAddress;
    shipment.trackingToken = trackingToken;

    // Save addresses first
    await Promise.all([
      this.addressRepository.save(pickupAddress),
      this.addressRepository.save(deliveryAddress),
    ]);
    await this.shipmentRepository.save(shipment);

    return {
      trackingToken: trackingToken,
    };
  }

  private generateTrackingToken(shipmentId: string): string {
    const payload = {
      shipmentId,
      exp: Date.now() + 48 * 60 * 60 * 1000, // 48 hours from now
    };
    return jwt.sign(payload, this.configService.get('TRACKING_TOKEN_SECRET'));
  }

  async findByHashedSecret(hashedSecret: string): Promise<Shipment | null> {
    return this.shipmentRepository.findOne({ where: { hashedSecret } });
  }

  private toBaseShipmentResponseDto(
    shipment: Shipment,
  ): BaseShipmentResponseDto {
    return {
      canisterShipmentId: shipment.canisterShipmentId,
      status: shipment.status,
      value: shipment.value,
      price: shipment.price,
    };
  }

  private toAddressResponse(address: Address): AddressLocationResponseDto {
    return {
      address: {
        street: address.street,
        city: address.city,
        zip: address.zip,
        country: address.country,
      },

      lat: address.lat,
      lng: address.lng,
    };
  }

  private toPendingShipmentResponseDto(
    shipment: Shipment,
  ): PendingShipmentResponseDto {
    return {
      ...this.toBaseShipmentResponseDto(shipment),
      pickup: shipment.pickupAddress
        ? this.toAddressResponse(shipment.pickupAddress)
        : null,
      delivery: shipment.deliveryAddress
        ? this.toAddressResponse(shipment.deliveryAddress)
        : null,
      trackingToken: shipment.trackingToken,
    };
  }

  // Get pending shipments for a shipper
  async findShipperPendingShipments(
    principal: string,
  ): Promise<PendingShipmentResponseDto[]> {
    const shipments = await this.shipmentRepository.find({
      where: {
        shipper: { principal },
        status: ShipmentStatus.PENDING,
      },
      relations: ['shipper', 'pickupAddress', 'deliveryAddress'],
    });

    return shipments.map((shipment) =>
      this.toPendingShipmentResponseDto(shipment),
    );
  }

  // Tab 2: Bought shipments with dates
  async findBoughtShipments(
    principal: string,
  ): Promise<BoughtShipmentResponseDto[]> {
    const shipments = await this.shipmentRepository.find({
      where: {
        shipper: { principal },
        status: In([ShipmentStatus.BOUGHT, ShipmentStatus.ROUTE_SET]),
      },
      relations: [
        'shipper',
        'carrier',
        'carrier.user',
        'pickupAddress',
        'deliveryAddress',
      ],
    });

    // Get all route stops for these shipments
    const stops = await this.routeStopRepo.find({
      where: {
        shipmentId: In(shipments.map((s) => s.id)),
        route: {
          status: Not(In([RouteStatus.COMPLETED, RouteStatus.CANCELLED])),
        },
        stopType: In(['PICKUP', 'DELIVERY']),
      },
      relations: ['shipment'],
    });

    return shipments.map((shipment) => {
      // Find pickup and delivery stops for this shipment
      const pickupStop = stops.find(
        (stop) => stop.shipmentId === shipment.id && stop.stopType === 'PICKUP',
      );
      const deliveryStop = stops.find(
        (stop) =>
          stop.shipmentId === shipment.id && stop.stopType === 'DELIVERY',
      );

      return {
        ...this.toPendingShipmentResponseDto(shipment),
        assignedCarrier: shipment.carrier
          ? {
              name: shipment.carrier.user.name ?? 'Carrier',
              principal: shipment.carrier.principal,
            }
          : null,
        estimatedPickupDate: pickupStop?.estimatedArrival,
        estimatedDeliveryDate: deliveryStop?.estimatedArrival,
        pickupTimeWindow:
          shipment.pickupWindowStart && shipment.pickupWindowEnd
            ? {
                start: shipment.pickupWindowStart,
                end: shipment.pickupWindowEnd,
              }
            : undefined,
        deliveryTimeWindow:
          shipment.deliveryWindowStart && shipment.deliveryWindowEnd
            ? {
                start: shipment.deliveryWindowStart,
                end: shipment.deliveryWindowEnd,
              }
            : undefined,
      };
    });
  }

  async setTimeWindows(
    canisterShipmentId: string,
    windows: ShipmentWindowsDto,
  ): Promise<void> {
    const shipment = await this.findOneById(canisterShipmentId);

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (
      shipment.status !== ShipmentStatus.BOUGHT &&
      shipment.status !== ShipmentStatus.PENDING
    ) {
      throw new BadRequestException(
        'Time windows can only be set for shipments in BOUGHT or PENDING status',
      );
    }

    if (
      windows.pickup.start > windows.pickup.end ||
      windows.delivery.start > windows.delivery.end ||
      windows.pickup.start > windows.delivery.start ||
      windows.pickup.start < new Date() ||
      windows.delivery.start < new Date()
    ) {
      throw new BadRequestException('Invalid time windows');
    }

    shipment.pickupWindowStart = windows.pickup.start;
    shipment.pickupWindowEnd = windows.pickup.end;
    shipment.deliveryWindowStart = windows.delivery.start;
    shipment.deliveryWindowEnd = windows.delivery.end;

    await this.shipmentRepository.save(shipment);
  }

  async findCarriedShipments(
    carrierId: string,
  ): Promise<BoughtShipmentResponseDto[]> {
    // Get all shipments assigned to routes
    const routeStops = await this.routeStopRepo.find({
      where: {
        route: {
          carrier: { principal: carrierId },
          status: Not(In([RouteStatus.COMPLETED, RouteStatus.CANCELLED])),
        },
      },
      relations: ['shipment'],
    });

    console.log(routeStops);

    // Transform bigint shipmentIds to numbers
    const assignedShipmentIds = routeStops
      .map((stop) => stop.shipment?.canisterShipmentId)
      .filter((id) => id !== undefined);

    console.log('Assigned shipment IDs:', assignedShipmentIds);

    // Get available shipments (not in routes)
    const shipments = await this.shipmentRepository.find({
      where: {
        carrier: { principal: carrierId },
        status: In([ShipmentStatus.BOUGHT]),
        canisterShipmentId: Not(In(assignedShipmentIds)), // Exclude shipments that are in routes
      },
      relations: [
        'shipper',
        'carrier',
        'carrier.user',
        'pickupAddress',
        'deliveryAddress',
      ],
    });

    return shipments.map((shipment) => {
      // Find pickup and delivery stops for this shipment
      const pickupStop = routeStops.find(
        (stop) =>
          stop.shipmentId === shipment.canisterShipmentId &&
          stop.stopType === 'PICKUP',
      );
      const deliveryStop = routeStops.find(
        (stop) =>
          stop.shipmentId === shipment.canisterShipmentId &&
          stop.stopType === 'DELIVERY',
      );

      return {
        ...this.toPendingShipmentResponseDto(shipment),
        assignedCarrier: shipment.carrier
          ? {
              name: shipment.carrier.user.name ?? 'Carrier',
              principal: shipment.carrier.principal,
            }
          : null,
        estimatedPickupDate: pickupStop?.estimatedArrival,
        estimatedDeliveryDate: deliveryStop?.estimatedArrival,
        pickupTimeWindow:
          shipment.pickupWindowStart && shipment.pickupWindowEnd
            ? {
                start: shipment.pickupWindowStart,
                end: shipment.pickupWindowEnd,
              }
            : undefined,
        deliveryTimeWindow:
          shipment.deliveryWindowStart && shipment.deliveryWindowEnd
            ? {
                start: shipment.deliveryWindowStart,
                end: shipment.deliveryWindowEnd,
              }
            : undefined,
      };
    });
  }

  async getPublicTracking(
    trackingToken: string,
  ): Promise<PublicShipmentTrackingDto> {
    try {
      // Verify and decode tracking token
      const decoded = jwt.verify(
        trackingToken,
        this.configService.get('TRACKING_TOKEN_SECRET'),
      ) as { shipmentId: string };


      const shipment = await this.shipmentRepository.findOne({
        where: { canisterShipmentId: decoded.shipmentId },
        relations: ['carrier', 'carrier.user'],
      });

      if (!shipment) {
        throw new NotFoundException('Shipment not found');
      }

      // Get route stops for this shipment
      const routeStops = await this.routeStopRepo.find({
        where: {
          shipmentId: shipment.id,
          route: {
            status: RouteStatus.ACTIVE,
          },
        },
        relations: ['route', 'route.stops', 'route.stops.shipment'],
      });

      if (!routeStops.length) {
        // Return basic info if no active route
        return {
          status: shipment.status,
          estimatedPickupDate: undefined,
          estimatedDeliveryDate: undefined,
          carrierName: shipment.carrier?.user?.name ?? 'Carrier',
          currentLocation: undefined,
          lastUpdate: undefined,
          remainingDistance: 0,
          remainingDuration: 0,
          isPickupPhase: true,
          isNearby: false,
        };
      }

      const route = routeStops[0].route;
      const currentLocation = route.lastLocation
        ? {
            lat: (route.lastLocation as any).coordinates[1],
            lng: (route.lastLocation as any).coordinates[0],
          }
        : undefined;

      if (!currentLocation) {
        return {
          status: shipment.status,
          estimatedPickupDate: undefined,
          estimatedDeliveryDate: undefined,
          carrierName: shipment.carrier?.user?.name ?? 'Carrier',
          currentLocation: undefined,
          lastUpdate: undefined,
          remainingDistance: 0,
          remainingDuration: 0,
          isPickupPhase: true,
          isNearby: false,
        };
      }

      // Get active segment and tracking info
      const trackingInfo =
        await this.routeTrackingService.getShipmentActiveSegment(
          route,
          shipment.canisterShipmentId,
          currentLocation,
        );

      // Find pickup and delivery stops
      const pickupStop = routeStops.find((stop) => stop.stopType === 'PICKUP');
      const deliveryStop = routeStops.find(
        (stop) => stop.stopType === 'DELIVERY',
      );

      // Get the relevant address based on the phase
      const isPickupPhase = trackingInfo?.isPickupRoute ?? true;
      const relevantAddress = isPickupPhase ? shipment.pickupAddress : shipment.deliveryAddress;

      return {
        status: shipment.status,
        estimatedPickupDate: pickupStop?.estimatedArrival,
        estimatedDeliveryDate: deliveryStop?.estimatedArrival,
        carrierName: shipment.carrier?.user?.name ?? 'Carrier',
        currentLocation,
        lastUpdate: route.lastLocationUpdate,
        remainingDistance: trackingInfo?.remainingDistance ?? 0,
        remainingDuration: trackingInfo?.remainingDuration ?? 0,
        isPickupPhase: trackingInfo?.isPickupRoute ?? true,
        isNearby: trackingInfo?.isNearby ?? false,
        activeSegment: trackingInfo?.segment
          ? {
              points: trackingInfo.segment.coordinates.map((coord) => ({
                lat: coord[1],
                lng: coord[0],
              })),
            }
          : undefined,
        pickup: isPickupPhase && relevantAddress ? this.toAddressResponse(relevantAddress) : undefined,
        delivery: !isPickupPhase && relevantAddress ? this.toAddressResponse(relevantAddress) : undefined
      };
    } catch (error) {
      if (
        error.name === 'JsonWebTokenError' ||
        error.name === 'TokenExpiredError'
      ) {
        throw new UnauthorizedException('Invalid or expired tracking token');
      }
      throw error;
    }
  }
}

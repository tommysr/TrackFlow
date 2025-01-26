import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
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
import { Address } from './entities/address.entity';
import { RouteStop } from '../routes/entities/routeStop.entity';
import { RouteStatus } from '../routes/entities/route.entity';
import { AddressLocationResponseDto } from './dto/address-location.dto';
import { ShipmentWindowsDto } from './dto/time-window.dto';
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

  async getTimeWindows(canisterShipmentId: string): Promise<ShipmentWindowsDto> {
    const shipment = await this.findOneById(canisterShipmentId);
    return {
      pickup: shipment.pickupWindowStart && shipment.pickupWindowEnd ? {
        start: shipment.pickupWindowStart,
        end: shipment.pickupWindowEnd,
        }
      : undefined,
      delivery: shipment.deliveryWindowStart && shipment.deliveryWindowEnd
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
        status: ShipmentStatus.BOUGHT,
      },
      relations: [
        'shipper',
        'carrier',
        'carrier.user',
        'pickupAddress',
        'deliveryAddress',
      ],
    });

    return shipments.map((shipment) => ({
      ...this.toPendingShipmentResponseDto(shipment),
      assignedCarrier: shipment.carrier
        ? {
            name: shipment.carrier.user.name ?? 'Carrier',
            principal: shipment.carrier.principal,
          }
        : null,
      estimatedPickupDate: shipment.estimatedPickupTime,
      estimatedDeliveryDate: shipment.estimatedDeliveryTime,
      pickupTimeWindow: shipment.pickupWindowStart && shipment.pickupWindowEnd
        ? {
            start: shipment.pickupWindowStart,
            end: shipment.pickupWindowEnd,
          }
        : undefined,
      deliveryTimeWindow: shipment.deliveryWindowStart && shipment.deliveryWindowEnd
        ? {
            start: shipment.deliveryWindowStart,
            end: shipment.deliveryWindowEnd,
          }
        : undefined,
    }));
  }

  async setTimeWindows(
    canisterShipmentId: string,
    windows: ShipmentWindowsDto,
  ): Promise<void> {
    const shipment = await this.findOneById(canisterShipmentId);

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (shipment.status !== ShipmentStatus.BOUGHT && shipment.status !== ShipmentStatus.PENDING) {
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

    return shipments.map((shipment) => ({
      ...this.toPendingShipmentResponseDto(shipment),
      assignedCarrier: shipment.carrier
        ? {
            name: shipment.carrier.user.name ?? 'Carrier',
            principal: shipment.carrier.principal,
          }
        : null,
      estimatedPickupDate: shipment.estimatedPickupTime,
      estimatedDeliveryDate: shipment.estimatedDeliveryTime,
      pickupTimeWindow: shipment.pickupWindowStart && shipment.pickupWindowEnd
        ? {
            start: shipment.pickupWindowStart,
            end: shipment.pickupWindowEnd,
          }
        : undefined,
      deliveryTimeWindow: shipment.deliveryWindowStart && shipment.deliveryWindowEnd
        ? {
            start: shipment.deliveryWindowStart,
            end: shipment.deliveryWindowEnd,
          }
        : undefined,
    }));
  }
}

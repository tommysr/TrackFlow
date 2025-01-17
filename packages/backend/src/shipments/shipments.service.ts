import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Shipment, ShipmentStatus } from './entities/shipment.entity';
import {
  AddressLocationResponseDto,
  BaseShipmentResponseDto,
  BoughtShipmentResponseDto,
  GeocodeResponseDto,
  PendingShipmentResponseDto,
} from './dto/shipment-response.dto';
import { ShipmentsSyncService } from './shipments-sync.service';
import {
  GeocodeAddressDto,
  SetAddressDto,
} from './dto/create-shipment.dto';
import { geocodeAddress } from '../utils/geocode.util';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { Address } from './entities/address.entity';

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
  ) {
    this.geocodingApiKey = this.configService.get('routing.apiKey');
  }

  async findOneById(id: number): Promise<Shipment> {
    await this.syncService.pullEvents();

    const shipment = await this.shipmentRepository.findOne({
      where: { canisterShipmentId: id },
      relations: [
        'shipper',
        'assignedCarrier',
        'pickupAddress',
        'deliveryAddress',
      ],
    });

    // console.log(`Shipment found: ${JSON.stringify(shipment)}`);

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    return shipment;
  }

  async findByCarrier(principal: string): Promise<Shipment[]> {
    return this.shipmentRepository.find({
      where: { assignedCarrier: { identity: { principal } } },
      relations: ['locations', 'events'],
    });
  }

  async getAddresses(
    shipmentId: number,
  ): Promise<GeocodeResponseDto> {
    const shipment = await this.findOneById(shipmentId);

    if (!shipment.pickupAddress.isComplete() || !shipment.deliveryAddress.isComplete()) {
      throw new NotFoundException('Shipment does not have pickup or delivery addresses');
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
        location: {
          lat: geocodedPickupAddress.latitude,
          lng: geocodedPickupAddress.longitude,
        },
        address: {
          street: geocodeAddressDto.pickupAddress.street,
          city: geocodeAddressDto.pickupAddress.city,
          zip: geocodeAddressDto.pickupAddress.zip,
          country: geocodeAddressDto.pickupAddress.country,
        },
        isComplete: false,
      },
      delivery: {
        location: {
          lat: geocodedDeliveryAddress.latitude,
          lng: geocodedDeliveryAddress.longitude,
        },
        address: {
          street: geocodeAddressDto.deliveryAddress.street,
          city: geocodeAddressDto.deliveryAddress.city,
          zip: geocodeAddressDto.deliveryAddress.zip,
          country: geocodeAddressDto.deliveryAddress.country,
        },
        isComplete: false,
      },
    };
  }

  // Modified createShipment to handle sync properly
  async setAddress(
    setAddressDto: SetAddressDto,
  ): Promise<{ trackingToken: string }> {
    const shipment = await this.findOneById(setAddressDto.shipmentId);

    if (!shipment) {
      throw new NotFoundException('Shipment not found on ICP');
    }


    if (
      shipment.status == ShipmentStatus.BOUGHT_WITH_ADDRESS
    ) {
      throw new BadRequestException('Shipment addresses cant be changed');
    }

    // Create pickup address
    const pickupAddress = this.addressRepository.create({
      ...setAddressDto.pickupAddress,
      latitude: setAddressDto.pickupAddress.lat,
      longitude: setAddressDto.pickupAddress.lng,
      icpLat: shipment.pickupAddress.icpLat,
      icpLng: shipment.pickupAddress.icpLng,
    });

    // Create delivery address
    const deliveryAddress = this.addressRepository.create({
      ...setAddressDto.deliveryAddress,
      latitude: setAddressDto.deliveryAddress.lat,
      longitude: setAddressDto.deliveryAddress.lng,
      icpLat: shipment.deliveryAddress.icpLat,
      icpLng: shipment.deliveryAddress.icpLng,
    });

    // Save addresses first
    await Promise.all([
      this.addressRepository.save(pickupAddress),
      this.addressRepository.save(deliveryAddress),
    ]);

    shipment.pickupAddress = pickupAddress;
    shipment.deliveryAddress = deliveryAddress;

    // Generate tracking token (24 hour validity)
    const trackingToken = this.generateTrackingToken(
      shipment.canisterShipmentId,
    );

    shipment.trackingToken = trackingToken;

    if (shipment.status === ShipmentStatus.PENDING_NO_ADDRESS) {
      shipment.status = ShipmentStatus.PENDING_WITH_ADDRESS;
    } else if (shipment.status === ShipmentStatus.BOUGHT_NO_ADDRESS) {
      shipment.status = ShipmentStatus.BOUGHT_WITH_ADDRESS;
    }

    await this.shipmentRepository.save(shipment);

    return {
      trackingToken: trackingToken,
    };
  }

  private generateTrackingToken(shipmentId: number): string {
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
      address: address.isComplete()
        ? {
            street: address.street,
            city: address.city,
            zip: address.zip,
            country: address.country,
          }
        : null,
      location: address.getPreciseLocation(),
      isComplete: address.isComplete(),
    };
  }

  private toPendingShipmentResponseDto(
    shipment: Shipment,
  ): PendingShipmentResponseDto {
    return {
      ...this.toBaseShipmentResponseDto(shipment),
      pickup: this.toAddressResponse(shipment.pickupAddress),
      delivery: this.toAddressResponse(shipment.deliveryAddress),
      trackingToken: shipment.trackingToken,
    };
  }

  // Get pending shipments for a shipper
  async findShipperPendingShipments(
    principal: string,
  ): Promise<PendingShipmentResponseDto[]> {
    const shipments = await this.shipmentRepository.find({
      where: {
        shipper: { identityId: principal },
        status: In([
          ShipmentStatus.PENDING_WITH_ADDRESS,
          ShipmentStatus.PENDING_NO_ADDRESS,
          ShipmentStatus.BOUGHT_NO_ADDRESS,
        ]),
      },
      relations: [
        'shipper',
        'pickupAddress',
        'deliveryAddress',
        'assignedCarrier',
      ],
    });

    // this.logger.log(shipments);

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
        shipper: { identity: { principal } },
        status: In([
          ShipmentStatus.BOUGHT_WITH_ADDRESS,
          ShipmentStatus.READY_FOR_PICKUP,
        ]),
      },
      relations: [
        'shipper',
        'assignedCarrier',
        'route',
        'pickupAddress',
        'deliveryAddress',
      ],
    });

    // this.logger.log(shipments);

    return shipments.map((shipment) => ({
      ...this.toPendingShipmentResponseDto(shipment),
      assignedCarrier: shipment.assignedCarrier
        ? {
            name: shipment.assignedCarrier.name,
            principal: shipment.assignedCarrier.identityId,
          }
        : null,
      estimatedPickupDate: shipment.estimatedPickupTime,
      estimatedDeliveryDate: shipment.estimatedDeliveryTime,
    }));
  }

  async markReadyForPickup(id: number, principal: string): Promise<boolean> {
    const shipment = await this.shipmentRepository.findOne({
      where: {
        canisterShipmentId: id,
        shipper: { identity: { principal } },
      },
      relations: [
        'shipper',
        'assignedCarrier',
        'route',
        'pickupAddress',
        'deliveryAddress',
      ],
    });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    if (!shipment.pickupAddress || !shipment.deliveryAddress) {
      throw new BadRequestException(
        'Shipment must have pickup and delivery addresses',
      );
    }

    if (shipment.status !== ShipmentStatus.BOUGHT_WITH_ADDRESS) {
      throw new BadRequestException(
        'Shipment must be in BOUGHT_WITH_ADDRESS status',
      );
    }

    shipment.status = ShipmentStatus.READY_FOR_PICKUP;
    await this.shipmentRepository.save(shipment);

    return true;
  }

  // Set Pickup Date, only carrier or admin
  async setPickupDate(id: number, pickupDate: Date): Promise<boolean> {
    const shipment = await this.findOneById(id);

    if (
      !shipment.pickupAddress ||
      !shipment.pickupAddress.latitude ||
      !shipment.pickupAddress.longitude
    ) {
      throw new BadRequestException(
        'Cannot set pickup date without a complete pickup address',
      );
    }

    if (shipment.status !== ShipmentStatus.READY_FOR_PICKUP) {
      throw new BadRequestException(
        'Cannot set pickup date for this shipment status',
      );
    }

    shipment.pickupDate = pickupDate;
    await this.shipmentRepository.save(shipment);
    return true;
  }

  // Set Delivery Date
  async setDeliveryDate(id: number, deliveryDate: Date): Promise<boolean> {
    const shipment = await this.findOneById(id);

    if (
      !shipment.deliveryAddress ||
      !shipment.deliveryAddress.latitude ||
      !shipment.deliveryAddress.longitude
    ) {
      throw new BadRequestException(
        'Cannot set delivery date without a complete delivery address',
      );
    }

    if (shipment.status !== ShipmentStatus.IN_TRANSIT) {
      throw new BadRequestException(
        'Cannot set delivery date for this shipment status',
      );
    }
    shipment.deliveryDate = deliveryDate;
    await this.shipmentRepository.save(shipment);
    return true;
  }

  async findCarriedShipments(
    principal: string,
  ): Promise<BoughtShipmentResponseDto[]> {
    const shipments = await this.shipmentRepository.find({
      where: { assignedCarrier: { identity: { principal } } },
      relations: [
        'shipper',
        'assignedCarrier',
        'route',
        'pickupAddress',
        'deliveryAddress',
      ],
    });

    return shipments.map((shipment) => ({
      ...this.toPendingShipmentResponseDto(shipment),
      assignedCarrier: shipment.assignedCarrier
        ? {
            name: shipment.assignedCarrier.name,
            principal: shipment.assignedCarrier.identityId,
          }
        : null,
      estimatedPickupDate: shipment.estimatedPickupTime,
      estimatedDeliveryDate: shipment.estimatedDeliveryTime,
    }));
  }
}

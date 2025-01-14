import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment, ShipmentStatus } from './entities/shipment.entity';
import { IcpUser, UserRole } from '../auth/entities/icp.user.entity';
import type {
  Shipment as CanisterShipment,
  ShipmentEvent as CanisterShipmentEvent,
  SizeCategory,
  ShipmentEvent,
} from '../../../declarations/canister/canister.did';
import { canisterId, createActor } from '../../../declarations/canister';
import { Carrier } from 'src/carriers/entities/carrier.entity';
import { Shipper } from '../auth/entities/shipper.entity';
import { Principal } from '@dfinity/principal';
import { Address } from './entities/address.entity';

const host = `http://localhost:4943`;

export const anonymousBackend = createActor(canisterId, {
  agentOptions: { host },
});

export function isCreatedEvent(
  event: CanisterShipmentEvent,
): event is { Created: { shipment_id: bigint } } {
  return (event as { Created: { shipment_id: bigint } }).Created !== undefined;
}

export function isBoughtEvent(
  event: CanisterShipmentEvent,
): event is { CarrierAssigned: { shipment_id: bigint; carrier: Principal } } {
  return (
    (event as { CarrierAssigned: { shipment_id: bigint; carrier: Principal } })
      .CarrierAssigned !== undefined
  );
}

@Injectable()
export class ShipmentsSyncService {
  private readonly logger = new Logger(ShipmentsSyncService.name);
  private lastProcessedSequence = BigInt(0);
  private isProcessing = false;

  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @InjectRepository(IcpUser)
    private readonly userRepository: Repository<IcpUser>,
    @InjectRepository(Carrier)
    private readonly carrierRepository: Repository<Carrier>,
    @InjectRepository(Shipper)
    private readonly shipperRepository: Repository<Shipper>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  async pullEvents() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      this.logger.debug('Starting to pull events...');

      // Get new events from canister
      const events = await anonymousBackend.getEvents([
        this.lastProcessedSequence,
      ]);
      this.logger.debug(`Received ${events.length} events from canister`);

      for (const timestampedEvent of events) {
        this.logger.debug(`Processing event from timestamped event: ${Number(timestampedEvent.timestamp)}`);
        await this.processEvent(timestampedEvent.event);
        this.lastProcessedSequence = timestampedEvent.sequence;
      }
    } catch (error) {
      this.logger.error('Failed to pull events:', error);
      this.logger.error('Stack trace:', error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvent(event: ShipmentEvent) {
    this.logger.debug(`Processing event`);
    if (isCreatedEvent(event)) {
      this.logger.debug('Handling shipment created event');
      await this.handleShipmentCreated(event);
    } else if (isBoughtEvent(event)) {
      this.logger.debug('Handling carrier assigned event');
      await this.handleCarrierAssigned(event);
    }
  }

  private async handleBoughtUpdate(shipment: Shipment, carrierPrincipal: Principal): Promise<void> {
    const carrier = await this.syncCarrier(carrierPrincipal);
    shipment.assignedCarrier = carrier;

    // Update status based on address completion
    if (!shipment.pickupAddress.isComplete() || !shipment.deliveryAddress.isComplete()) {
      shipment.status = ShipmentStatus.BOUGHT_NO_ADDRESS;
    } else {
      shipment.status = ShipmentStatus.BOUGHT_WITH_ADDRESS;
    }
  }

  private async handleCarrierAssigned(event: {
    CarrierAssigned: { shipment_id: bigint; carrier: Principal };
  }) {
    const shipment = await this.shipmentRepository.findOne({
      where: { canisterShipmentId: Number(event.CarrierAssigned.shipment_id) },
    });


    if (!shipment) {
      this.logger.debug('Shipment not found');
      throw new NotFoundException('Shipment not found');
    }

    await this.handleBoughtUpdate(shipment, event.CarrierAssigned.carrier);

    await this.shipmentRepository.save(shipment);
  }

  private async handleShipmentCreated(event: {
    Created: { shipment_id: bigint };
  }) {
    this.logger.debug(
      `Handling shipment created event for ID: ${event.Created.shipment_id}`,
    );

    const shipment = await this.shipmentRepository.findOne({
      where: { canisterShipmentId: Number(event.Created.shipment_id) },
    });

    if (!shipment) {
      this.logger.debug('Shipment not found, fetching from canister...');
      // Fetch full shipment data and create
      const canisterShipmentOpt = await anonymousBackend.getShipment(
        event.Created.shipment_id,
      );
      this.logger.debug(`Canister shipment data`);

      if (canisterShipmentOpt.length > 0) {
        await this.syncShipment(canisterShipmentOpt[0]);
      }
    }
  }

  async syncShipment(canisterShipment: CanisterShipment): Promise<Shipment> {
    try {
      this.logger.debug(`Starting syncShipment for ID: ${canisterShipment.id}`);

      // Find existing shipment or create new one
      let shipment = await this.shipmentRepository.findOne({
        where: { canisterShipmentId: Number(canisterShipment.id) },
        relations: [
          'shipper',
          'assignedCarrier',
          'route',
          'pickupAddress',
          'deliveryAddress',
        ],
      });

      if (!shipment) {
        this.logger.debug(
          'Creating new shipment with pickup and delivery addresses',
        );

        // Create addresses with ICP coordinates
        const pickupAddress = this.addressRepository.create({
          icpLat: canisterShipment.info.source.lat,
          icpLng: canisterShipment.info.source.lng,
        });

        const deliveryAddress = this.addressRepository.create({
          icpLat: canisterShipment.info.destination.lat,
          icpLng: canisterShipment.info.destination.lng,
        });

        await this.addressRepository.save([pickupAddress, deliveryAddress]);

        shipment = this.shipmentRepository.create({
          canisterShipmentId: Number(canisterShipment.id),
          status: ShipmentStatus.PENDING_NO_ADDRESS,
          pickupAddress,
          deliveryAddress,
          value: Number(canisterShipment.info.value),
          price: Number(canisterShipment.info.price),
          size: this.getSizeCategory(canisterShipment.info.size_category),
          hashedSecret: canisterShipment.hashed_secret.toString(),
        });
      }

      if (!shipment.shipper) {
        shipment.shipper = await this.syncShipper(canisterShipment.customer);
      }
      // Save shipment
      this.logger.debug('Saving shipment');
      const savedShipment = await this.shipmentRepository.save(shipment);
      this.logger.debug('Shipment saved successfully');
      return savedShipment;
    } catch (error) {
      this.logger.error(
        `Failed to sync shipment ${canisterShipment.id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private getSizeCategory(sizeCategory: SizeCategory): string {
    if (sizeCategory && typeof sizeCategory === 'object') {
      const sizeCategories = Object.keys(sizeCategory);
      return sizeCategories.length > 0 ? sizeCategories[0] : 'STANDARD';
    } else {
      return 'STANDARD';
    }
  }

  private async syncShipper(principal: Principal): Promise<Shipper> {
    // Get or create ICP user for shipper
    let icpUser = await this.userRepository.findOne({
      where: { principal: principal.toString() },
    });

    if (!icpUser) {
      icpUser = this.userRepository.create({
        principal: principal.toString(),
        role: UserRole.USER,
      });
      await this.userRepository.save(icpUser);
    }

    // Get or create shipper
    let shipper = await this.shipperRepository.findOne({
      where: { identity: { principal: icpUser.principal } },
    });

    if (!shipper) {
      shipper = this.shipperRepository.create({
        identity: icpUser,
      });
      await this.shipperRepository.save(shipper);
    }

    return shipper;
  }

  private async syncCarrier(principal: Principal): Promise<Carrier> {
    // First find or create ICP user
    const icpUser = await this.userRepository.findOne({
      where: { principal: principal.toString() },
    });

    if (!icpUser) {
      const newIcpUser = this.userRepository.create({
        principal: principal.toString(),
        role: UserRole.CARRIER,
      });
      await this.userRepository.save(newIcpUser);
    }

    // Then find or create carrier
    const carrier = await this.carrierRepository.findOne({
      where: { identity: { principal: icpUser.principal } },
    });

    if (!carrier) {
      const newCarrier = this.carrierRepository.create({
        identity: icpUser,
        name: 'Unknown Carrier',
        contactInfo: 'No contact info',
        fuelEfficiency: 12,
        fuelCostPerLiter: 1.5,
        maxDailyRoutes: 1,
      });
      await this.carrierRepository.save(newCarrier);
    }

    return carrier;
  }
}

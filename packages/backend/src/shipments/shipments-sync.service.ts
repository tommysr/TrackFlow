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
import { ShipmentSequence } from './entities/shipment-sequence.entity';

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
    @InjectRepository(ShipmentSequence)
    private readonly sequenceRepository: Repository<ShipmentSequence>,
  ) {}

  private async getLastProcessedSequence(): Promise<bigint> {
    let sequence = await this.sequenceRepository.findOne({
      where: { id: 'shipment_sequence' },
    });

    if (!sequence) {
      sequence = this.sequenceRepository.create({
        lastProcessedSequence: '0',
      });
      await this.sequenceRepository.save(sequence);
    }

    return BigInt(sequence.lastProcessedSequence);
  }

  private async updateLastProcessedSequence(sequence: bigint): Promise<void> {
    await this.sequenceRepository.update(
      { id: 'shipment_sequence' },
      {
        lastProcessedSequence: sequence.toString(),
        lastUpdated: new Date(),
      },
    );
  }

  async pullEvents() {
    if (this.isProcessing) {
      this.logger.debug('Already processing events, skipping...');
      return;
    }

    try {
      this.isProcessing = true;
      this.logger.debug('Starting to pull events...');

      const lastProcessedSequence = await this.getLastProcessedSequence();

      // Get new events from canister
      const events = await anonymousBackend.getEvents([lastProcessedSequence]);
      this.logger.debug(`Received ${events.length} events from canister`);

      for (const timestampedEvent of events) {
        this.logger.debug(
          `Processing event from timestamped event: ${Number(timestampedEvent.timestamp)}`,
        );
        await this.processEvent(timestampedEvent.event);
        await this.updateLastProcessedSequence(timestampedEvent.sequence);
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

  private async handleBoughtUpdate(
    shipment: Shipment,
    carrierPrincipal: Principal,
  ): Promise<void> {
    const carrier = await this.syncCarrier(carrierPrincipal);
    shipment.carrier = carrier;
    shipment.status = ShipmentStatus.BOUGHT;
  }

  private async handleCarrierAssigned(event: {
    CarrierAssigned: { shipment_id: bigint; carrier: Principal };
  }) {
    const shipment = await this.shipmentRepository.findOne({
      where: {
        canisterShipmentId: event.CarrierAssigned.shipment_id.toString(),
      },
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
      where: { canisterShipmentId: event.Created.shipment_id.toString() },
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
        where: { canisterShipmentId: canisterShipment.id.toString() },
        relations: ['shipper', 'carrier', 'pickupAddress', 'deliveryAddress'],
      });

      if (!shipment) {
        this.logger.debug(
          'Creating new shipment with pickup and delivery addresses',
        );

        shipment = this.shipmentRepository.create({
          canisterShipmentId: canisterShipment.id.toString(),
          status: ShipmentStatus.PENDING,
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
        roles: [UserRole.USER, UserRole.SHIPPER],
      });
      await this.userRepository.save(icpUser);
    } else if (!icpUser.roles.includes(UserRole.SHIPPER)) {
      icpUser.roles = [...icpUser.roles, UserRole.SHIPPER];
      await this.userRepository.save(icpUser);
    }

    // Get or create shipper
    let shipper = await this.shipperRepository.findOne({
      where: { principal: icpUser.principal },
      relations: ['user'],
    });

    if (!shipper) {
      shipper = this.shipperRepository.create({
        user: icpUser,
      });
      await this.shipperRepository.save(shipper);
    }

    return shipper;
  }

  private async syncCarrier(principal: Principal): Promise<Carrier> {
    // First find or create ICP user
    let icpUser = await this.userRepository.findOne({
      where: { principal: principal.toString() },
    });

    if (!icpUser) {
      icpUser = this.userRepository.create({
        name: 'Carrier',
        principal: principal.toString(),
        roles: [UserRole.USER, UserRole.CARRIER],
      });
      await this.userRepository.save(icpUser);
    } else if (!icpUser.roles.includes(UserRole.CARRIER)) {
      icpUser.roles = [...icpUser.roles, UserRole.CARRIER];
      await this.userRepository.save(icpUser);
    }

    // Then find or create carrier
    let carrier = await this.carrierRepository.findOne({
      where: { principal: icpUser.principal },
      relations: ['user'],
    });

    if (!carrier) {
      carrier = this.carrierRepository.create({
        user: icpUser,
        fuelEfficiency: 12,
        fuelCostPerLiter: 1.5,
      });
      await this.carrierRepository.save(carrier);
    }

    return carrier;
  }
}

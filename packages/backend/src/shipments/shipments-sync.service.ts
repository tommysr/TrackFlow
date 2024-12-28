import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment, ShipmentStatus } from './entities/shipment.entity';
import { IcpUser, UserRole } from '../auth/entities/icp.user.entity';
import { ShipmentEvent, EventType } from './entities/shipment-event.entity';
import { ShipmentLocation } from './entities/shipment-location.entity';
import type {
  Shipment as CanisterShipment,
  TimestampedEvent,
  ShipmentEvent as CanisterShipmentEvent,
} from '../../../declarations/canister/canister.did';
import { canisterId, createActor } from '../../../declarations/canister';
import { Carrier } from 'src/carriers/entities/carrier.entity';

const host = `http://localhost:4943`;

export const anonymousBackend = createActor(canisterId, {
  agentOptions: { host },
});

export function isCreatedEvent(
  event: CanisterShipmentEvent,
): event is { Created: { shipment_id: bigint } } {
  return (event as { Created: { shipment_id: bigint } }).Created !== undefined;
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
    @InjectRepository(ShipmentEvent)
    private readonly eventRepository: Repository<ShipmentEvent>,
    @InjectRepository(ShipmentLocation)
    private readonly locationRepository: Repository<ShipmentLocation>,
    @InjectRepository(Carrier)
    private readonly carrierRepository: Repository<Carrier>,
  ) {}

  async pullEvents() {
    if (this.isProcessing) return;

    try {
      this.isProcessing = true;
      this.logger.debug('Starting to pull events...');

      // Get new events from canister
      const events = await anonymousBackend.getEvents([this.lastProcessedSequence]);
      this.logger.debug(`Received ${events.length} events from canister`);

      for (const event of events) {
        this.logger.debug(`Processing event`);
        await this.processEvent(event);
        this.lastProcessedSequence = event.sequence;
      }
    } catch (error) {
      this.logger.error('Failed to pull events:', error);
      this.logger.error('Stack trace:', error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvent(event: TimestampedEvent) {
    this.logger.debug(`Processing event`);
    if (isCreatedEvent(event.event)) {
      await this.handleShipmentCreated(event.event);
    }
  }

  private async handleShipmentCreated(event: { Created: { shipment_id: bigint } }) {
    this.logger.debug(`Handling shipment created event for ID: ${event.Created.shipment_id}`);
    
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
      this.logger.debug(`Canister shipment data`);

      // Find existing shipment or create new one
      let shipment = await this.shipmentRepository.findOne({
        where: { canisterShipmentId: Number(canisterShipment.id) },
        relations: [
          'shipper', 
          'carrierPrincipal', 
          'assignedCarrier',
          'locations',
          'events'
        ]
      });

      if (!shipment) {
        this.logger.debug('Creating new shipment');
        shipment = new Shipment();
        shipment.canisterShipmentId = Number(canisterShipment.id);
        shipment.status = ShipmentStatus.CREATED;
      } else {
        this.logger.debug('Updating existing shipment');
      }

      // Get or create shipper with proper relations
      let shipper = await this.userRepository.findOne({
        where: { principal: canisterShipment.customer.toString() },
        relations: ['shipments', 'carriedShipments']
      });
      
      if (!shipper) {
        shipper = this.userRepository.create({
          principal: canisterShipment.customer.toString(),
          role: UserRole.SHIPPER,
          shipments: [],
          carriedShipments: []
        });
        await this.userRepository.save(shipper);
      }

      // Add shipment to shipper's shipments array if not already present
      if (!shipper.shipments.some(s => s.id === shipment.id)) {
        shipper.shipments.push(shipment);
        await this.userRepository.save(shipper);
      }
      shipment.shipper = shipper;

      // If there's a carrier assigned, update their carriedShipments array
      if (shipment.carrierPrincipal) {
        const carrier = await this.userRepository.findOne({
          where: { principal: shipment.carrierPrincipal.principal },
          relations: ['carriedShipments']
        });
        
        if (carrier && !carrier.carriedShipments.some(s => s.id === shipment.id)) {
          carrier.carriedShipments.push(shipment);
          await this.userRepository.save(carrier);
        }
      }

      // Initialize arrays if they don't exist
      shipment.locations = shipment.locations || [];
      shipment.events = shipment.events || [];

      // Set default values for nullable fields
      shipment.eta = shipment.eta || null;
      shipment.carrierPrincipal = shipment.carrierPrincipal || null;
      shipment.assignedCarrier = shipment.assignedCarrier || null;

      // Log all assignments
      this.logger.debug('Assigning shipment values:', {
        value: Number(canisterShipment.info.value),
        price: Number(canisterShipment.info.price),
        size: canisterShipment.info.size_category || 'STANDARD',
        hashedSecret: canisterShipment.hashed_secret || '',
      });

      // Required fields
      shipment.value = Number(canisterShipment.info.value) || 0;
      shipment.price = Number(canisterShipment.info.price) || 0;
      shipment.size = Object.keys(canisterShipment.info.size_category)[0] || 'STANDARD';
      shipment.hashedSecret = canisterShipment.hashed_secret || '';

      // Update status
      const newStatus = this.mapCanisterStatus(canisterShipment.status);
      if (shipment.status !== newStatus) {
        this.logger.debug(`Updating status from ${shipment.status} to ${newStatus}`);
        
        // Save the shipment with the new status first
        shipment.status = newStatus;
        await this.shipmentRepository.save(shipment);
        
        // Then create the status change event
        await this.createStatusChangeEvent(shipment);
      }

      // Update locations
      await this.syncLocations(shipment, canisterShipment);

      // Save shipment
      this.logger.debug('Saving shipment');
      const savedShipment = await this.shipmentRepository.save(shipment);
      this.logger.debug('Shipment saved successfully');
      return savedShipment;

    } catch (error) {
      this.logger.error(
        `Failed to sync shipment ${canisterShipment.id}: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  private async syncLocations(shipment: Shipment, canisterShipment: CanisterShipment) {
    this.logger.debug('Syncing locations');
    try {
      // Create/update source location
      let sourceLocation = shipment.locations?.find(
        (l) => l.street === canisterShipment.info.source.street,
      );
      if (!sourceLocation) {
        sourceLocation = new ShipmentLocation();
        sourceLocation.shipment = shipment;
      }
      sourceLocation.street = canisterShipment.info.source.street;
      sourceLocation.latitude = Number(canisterShipment.info.source.lat);
      sourceLocation.longitude = Number(canisterShipment.info.source.lng);
      await this.locationRepository.save(sourceLocation);

      // Create/update destination location
      let destLocation = shipment.locations?.find(
        (l) => l.street === canisterShipment.info.destination.street,
      );
      if (!destLocation) {
        destLocation = new ShipmentLocation();
        destLocation.shipment = shipment;
      }
      destLocation.street = canisterShipment.info.destination.street;
      destLocation.latitude = Number(canisterShipment.info.destination.lat);
      destLocation.longitude = Number(canisterShipment.info.destination.lng);
      await this.locationRepository.save(destLocation);
    } catch (error) {
      this.logger.error('Error syncing locations:', error);
      throw error;
    }
  }

  private async createStatusChangeEvent(shipment: Shipment) {
    const event = new ShipmentEvent();
    event.shipment = shipment;
    event.type = EventType.STATUS_CHANGED;
    event.notes = `Status changed to ${shipment.status}`;
    try {
      await this.eventRepository.save(event);
    } catch (error) {
      this.logger.error('Error creating status change event:', error);
      throw error;
    }
  }

  private mapCanisterStatus(status: any): ShipmentStatus {
    if ('Pending' in status) return ShipmentStatus.PENDING;
    if ('InTransit' in status) return ShipmentStatus.IN_TRANSIT;
    if ('Delivered' in status) return ShipmentStatus.DELIVERED;
    if ('Cancelled' in status) return ShipmentStatus.CANCELLED;
    return ShipmentStatus.CREATED;
  }

  private async syncCarrier(carrierPrincipal: IcpUser, carrierInfo: any) {
    let carrier = await this.carrierRepository.findOne({
      where: { principal: { principal: carrierPrincipal.principal } },
    });

    if (!carrier) {
      carrier = this.carrierRepository.create({
        principal: carrierPrincipal,
        name: carrierInfo.name || 'Unknown Carrier',
        contactInfo: carrierInfo.contactInfo || 'No contact info',
      });
      await this.carrierRepository.save(carrier);
    }

    return carrier;
  }
}

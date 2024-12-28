import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shipment, ShipmentStatus } from './entities/shipment.entity';
import { GPSData } from '../gps/entities/gps-data.entity';
import { ShipmentResponseDto } from './dto/shipment-response.dto';
import { ShipmentEvent } from './entities/shipment-event.entity';
import { ShipmentsSyncService } from './shipments-sync.service';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @InjectRepository(GPSData)
    private readonly gpsRepository: Repository<GPSData>,
    @InjectRepository(ShipmentEvent)
    private readonly eventRepository: Repository<ShipmentEvent>,
    private readonly syncService: ShipmentsSyncService,
  ) {}

  async findOneById(id: string): Promise<Shipment> {
    const shipment = await this.shipmentRepository.findOne({
      where: { id },
      relations: ['shipper', 'carrierPrincipal'],
    });
    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }
    return shipment;
  }

  async findByShipper(principal: string): Promise<ShipmentResponseDto[]> {
    // First sync with ICP
    await this.syncService.pullEvents();

    // Then proceed with the existing logic
    const shipments = await this.shipmentRepository.find({
      where: { shipper: { principal } },
      relations: ['locations', 'assignedCarrier', 'carrierPrincipal', 'shipper', 'events'],
    });

    console.log(shipments);

    const responses: ShipmentResponseDto[] = [];

    for (const shipment of shipments) {
      const response = new ShipmentResponseDto();
      Object.assign(response, {
        id: shipment.id,
        canisterShipmentId: shipment.canisterShipmentId,
        status: shipment.status,
        value: shipment.value,
        price: shipment.price,
      });

      // Get pickup and delivery events
      const events = await this.eventRepository.find({
        where: { shipment: { id: shipment.id } },
        order: { eventTime: 'DESC' },
      });

      const pickupEvent = events.find((e) => e.notes?.includes('PICKUP'));
      const deliveryEvent = events.find((e) => e.notes?.includes('DELIVERY'));

      if (pickupEvent) response.pickupDate = pickupEvent.eventTime;
      if (deliveryEvent) response.deliveryDate = deliveryEvent.eventTime;

      // If shipment is in transit, get carrier's current location and route
      if (
        shipment.status === ShipmentStatus.IN_TRANSIT &&
        shipment.assignedCarrier
      ) {
        const lastGpsData = await this.gpsRepository.findOne({
          where: { carrier: { id: shipment.assignedCarrier.id } },
          order: { timestamp: 'DESC' },
        });

        if (lastGpsData) {
          response.lastUpdate = lastGpsData.timestamp;
          response.currentLocation = {
            lat: Number(lastGpsData.latitude),
            lng: Number(lastGpsData.longitude),
          };

          // Calculate ETA based on remaining route distance and average speed
          response.eta = await this.calculateETA(shipment.id);

          // Get route segment for visualization
          response.routeSegment = await this.getRouteSegment(shipment.id);
        }
      }

      responses.push(response);
    }

    return responses;
  }

  private async calculateETA(shipmentId: string): Promise<number> {
    // Implementation depends on your routing service
    // This is a placeholder that returns random minutes between 5-60
    return Math.floor(Math.random() * 55) + 5;
  }

  private async getRouteSegment(shipmentId: string): Promise<{
    points: Array<{ lat: number; lng: number }>;
  }> {
    // Implementation depends on your routing service
    // This is a placeholder that returns a simple route
    return {
      points: [
        { lat: 40.7128, lng: -74.006 },
        { lat: 40.758, lng: -73.9855 },
      ],
    };
  }

  async findByCarrier(principal: string): Promise<Shipment[]> {
    return this.shipmentRepository.find({
      where: { carrierPrincipal: { principal } },
      relations: ['locations', 'events'],
    });
  }

  async updateStatus(
    id: string,
    updateStatusDto: UpdateStatusDto,
  ): Promise<Shipment> {
    const shipment = await this.findOneById(id);
    shipment.status = updateStatusDto.status;
    return this.shipmentRepository.save(shipment);
  }
}

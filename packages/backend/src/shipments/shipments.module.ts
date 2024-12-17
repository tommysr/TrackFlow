import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shipment } from './entities/shipment.entity';
import { ShipmentLocation } from './entities/shipment-location.entity';
import { ShipmentEvent } from './entities/shipment-event.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Shipment, ShipmentLocation, ShipmentEvent])],
  exports: [TypeOrmModule],
})
export class ShipmentsModule {} 
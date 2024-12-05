import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shipment } from './entities/shipment.entity';
import { ShipmentLocation } from './entities/shipment-location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Shipment, ShipmentLocation])],
  exports: [TypeOrmModule],
})
export class ShipmentsModule {} 
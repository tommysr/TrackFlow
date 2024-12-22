import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shipment } from './entities/shipment.entity';
import { ShipmentLocation } from './entities/shipment-location.entity';
import { ShipmentEvent } from './entities/shipment-event.entity';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Shipment, ShipmentLocation, ShipmentEvent])],
  exports: [TypeOrmModule, ShipmentsService],
  providers: [ShipmentsService],
  controllers: [ShipmentsController],
})

export class ShipmentsModule {} 
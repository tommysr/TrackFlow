import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';
import { ShipmentsSyncService } from './shipments-sync.service';
import { Shipment } from './entities/shipment.entity';
import { ShipmentEvent } from './entities/shipment-event.entity';
import { ShipmentLocation } from './entities/shipment-location.entity';
import { IcpUser } from '../auth/entities/icp.user.entity';
import { GPSData } from '../gps/entities/gps-data.entity';
import { Carrier } from '../carriers/entities/carrier.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shipment,
      ShipmentEvent,
      ShipmentLocation,
      IcpUser,
      GPSData,
      Carrier,
    ]),
  ],
  controllers: [ShipmentsController],
  providers: [ShipmentsService, ShipmentsSyncService],
  exports: [ShipmentsService, ShipmentsSyncService],
})
export class ShipmentsModule {} 
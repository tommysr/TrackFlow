import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';
import { ShipmentsSyncService } from './shipments-sync.service';
import { AuthModule } from '../auth/auth.module';
import { Shipment } from './entities/shipment.entity';
import { GPSData } from 'src/gps/entities/gps-data.entity';
import { Address } from './entities/address.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shipment, GPSData, Address]),
    forwardRef(() => AuthModule),
  ],
  controllers: [ShipmentsController],
  providers: [
    ShipmentsService, 
    ShipmentsSyncService, 
  ],
  exports: [ShipmentsService, ShipmentsSyncService],
})
export class ShipmentsModule {} 
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsService } from './shipments.service';
import { ShipmentsSyncService } from './shipments-sync.service';
import { AuthModule } from '../auth/auth.module';
import { Shipment } from './entities/shipment.entity';
import { GPSData } from 'src/gps/entities/gps-data.entity';
import { Address } from './entities/address.entity';
import { RoutesModule } from 'src/routes/routes.module';
import { CommonModule } from 'src/common/common.module';
import { GPSModule } from 'src/gps/gps.module';
import { CoreModule } from 'src/core/core.module';
import { CarriersModule } from 'src/carriers/carriers.module';
import { RouteStop } from 'src/routes/entities/routeStop.entity';
import { IcpUser } from '../auth/entities/icp.user.entity';
import { Carrier } from '../carriers/entities/carrier.entity';
import { Shipper } from '../auth/entities/shipper.entity';
import { ShipmentSequence } from './entities/shipment-sequence.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Shipment,
      GPSData,
      Address,
      RouteStop,
      IcpUser,
      Carrier,
      Shipper,
      ShipmentSequence,
    ]),
    CoreModule,
    GPSModule,
    CarriersModule,
    forwardRef(() => AuthModule),
    forwardRef(() => RoutesModule),
    forwardRef(() => CommonModule),
  ],
  controllers: [ShipmentsController],
  providers: [
    ShipmentsService, 
    ShipmentsSyncService, 
  ],
  exports: [ShipmentsService, ShipmentsSyncService],
})
export class ShipmentsModule {} 
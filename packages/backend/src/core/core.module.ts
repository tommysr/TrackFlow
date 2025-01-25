import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RouteTrackingService } from './services/route-tracking.service';
import { Route } from '../routes/entities/route.entity';
import { RouteStop } from '../routes/entities/routeStop.entity';
import { Shipment } from '../shipments/entities/shipment.entity';
import { CommonModule } from '../common/common.module';
import { RoutesModule } from '../routes/routes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Route, RouteStop, Shipment]),
    forwardRef(() =>RoutesModule),
    CommonModule,
  ],
  providers: [RouteTrackingService],
  exports: [RouteTrackingService],
})
export class CoreModule {} 
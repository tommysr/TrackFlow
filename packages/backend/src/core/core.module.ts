import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RouteTrackingService } from './services/route-tracking.service';
import { Route } from '../routes/entities/route.entity';
import { RouteStop } from '../routes/entities/routeStop.entity';
import { Shipment } from '../shipments/entities/shipment.entity';
import { CommonModule } from '../common/common.module';
import { RoutesModule } from '../routes/routes.module';
import { RouteDistanceMatrix } from 'src/routes/entities/route-distance-matrix.entity';
import { ShipmentRouteHistory } from 'src/routes/entities/shipment-route-history.entity';
import { RouteMetrics } from 'src/routes/entities/route-metrics.entity';
import { RoutingService } from './services/routing.service';
import { ETAService } from './services/eta.service';
import { RouteDelay } from 'src/routes/entities/route-delay.entity';
import { NotificationService } from './services/notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Route, RouteStop, Shipment, RouteMetrics, RouteDistanceMatrix, ShipmentRouteHistory, RouteDelay]),
    forwardRef(() => RoutesModule),
    CommonModule,
  ],
  providers: [RouteTrackingService, RoutingService, ETAService, NotificationService],
  exports: [RouteTrackingService, NotificationService],
})
export class CoreModule {} 
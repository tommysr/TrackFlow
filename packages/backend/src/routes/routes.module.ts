import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoutesService } from './routes.service';
import { RoutesController } from './routes.controller';
import { CoreModule } from '../core/core.module';
import { AuthModule } from 'src/auth/auth.module';
import { CommonModule } from 'src/common/common.module';
import { ConfigModule } from '@nestjs/config';
// import { Route } from 'src/aggregation/entities/route.entity';
import { RouteSegment } from './entities/routeSegment.entity';
import { RouteStop } from './entities/routeStop.entity';
import { Route } from './entities/route.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Route, RouteStop, RouteSegment ]),
    forwardRef(() => CoreModule),
    forwardRef(() => AuthModule),
    CommonModule,
    ConfigModule,
  ],
  providers: [RoutesService],
  controllers: [RoutesController],
  exports: [RoutesService],
})
export class RoutesModule {} 
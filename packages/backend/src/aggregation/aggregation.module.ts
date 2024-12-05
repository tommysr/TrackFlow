// src/aggregation/aggregation.module.ts
import { Module } from '@nestjs/common';
import { AggregationService } from './aggregation.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GPSData } from '../gps/entities/gps-data.entity';
import { Route } from './entities/route.entity';
import { Statistics } from './entities/statistics.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([GPSData, Route, Statistics]),
    ConfigModule,
  ],
  providers: [AggregationService],
})
export class AggregationModule {}

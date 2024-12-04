import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GPSData } from './entities/gps-data.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GPSData])],
  exports: [TypeOrmModule],
})
export class GPSModule {} 
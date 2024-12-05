import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GPSData } from './entities/gps-data.entity';
import { GPSService } from './gps.service';
import { GPSController } from './gps.controller';
import { Carrier } from '../carriers/entities/carrier.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GPSData, Carrier])],
  exports: [GPSService],
  providers: [GPSService],
  controllers: [GPSController],
})
export class GPSModule {}

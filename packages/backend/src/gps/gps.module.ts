import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GPSService } from './gps.service';
import { GPSData } from './entities/gps-data.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([GPSData]),
  ],
  providers: [GPSService],
  exports: [GPSService],
})
export class GPSModule {}

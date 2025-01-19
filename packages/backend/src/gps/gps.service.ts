// src/gps/gps.service.ts
import { Injectable, Logger} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GPSData } from './entities/gps-data.entity';

@Injectable()
export class GPSService {
  private readonly logger = new Logger(GPSService.name);

  constructor(
    @InjectRepository(GPSData)
    private gpsRepository: Repository<GPSData>,
  ) {}

  async saveLocation(data: {
    carrierId: string;
    latitude: number;
    longitude: number;
    timestamp: Date;
  }): Promise<GPSData> {
    const gpsData = this.gpsRepository.create({
      carrier: { principal: data.carrierId },
      location: { type: 'Point', coordinates: [data.longitude, data.latitude] },
      timestamp: data.timestamp,
    });
    return this.gpsRepository.save(gpsData);
  }

  async getLastKnownLocation(carrierId: string): Promise<GPSData | null> {
    return this.gpsRepository.findOne({
      where: { carrier: { principal: carrierId } },
      order: { timestamp: 'DESC' },
    });
  }
}

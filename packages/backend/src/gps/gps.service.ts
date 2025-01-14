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
      carrier: { id: data.carrierId },
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: data.timestamp,
    });
    return this.gpsRepository.save(gpsData);
  }

  async getLastKnownLocation(carrierId: string): Promise<GPSData | null> {
    return this.gpsRepository.findOne({
      where: { carrier: { id: carrierId } },
      order: { timestamp: 'DESC' },
    });
  }
}

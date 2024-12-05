// src/gps/gps.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GPSData } from './entities/gps-data.entity';
import { CreateGPSDataDto } from './dto/create-gps-data.dto';
import { Carrier } from '../carriers/entities/carrier.entity';
// import { KafkaProducerService } from '../kafka/kafka.service';

@Injectable()
export class GPSService {
  constructor(
    @InjectRepository(GPSData)
    private gpsDataRepository: Repository<GPSData>,
    @InjectRepository(Carrier)
    private carrierRepository: Repository<Carrier>,
    // private kafkaProducer: KafkaProducerService,
  ) {}

  async handleGPSUpdate(createGPSDataDto: CreateGPSDataDto): Promise<{ status: string }> {
    const { carrierId, latitude, longitude, timestamp } = createGPSDataDto;

    const carrier = await this.carrierRepository.findOne({ where: { id: carrierId } });
    if (!carrier) {
      throw new BadRequestException('Invalid carrier ID');
    }

    const gpsData = this.gpsDataRepository.create({
      carrier,
      latitude,
      longitude,
      timestamp: new Date(timestamp),
    });

    await this.gpsDataRepository.save(gpsData);

    // await this.kafkaProducer.sendMessage('gps-updates', JSON.stringify(createGPSDataDto));

    return { status: 'GPS data received' };
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { GPSService } from './gps.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GPSData } from './entities/gps-data.entity';
import { Carrier } from '../carriers/entities/carrier.entity';
import { BadRequestException } from '@nestjs/common';
import { KafkaProducerService } from '../kafka/kafka.service';

describe('GPSService', () => {
  let service: GPSService;
  let gpsRepository: Repository<GPSData>;
  let carrierRepository: Repository<Carrier>;
  let kafkaProducer: KafkaProducerService;

  beforeEach(async () => {
    const mockKafkaProducer = {
      sendMessage: jest.fn().mockResolvedValue(true), // Mock sendMessage method
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GPSService,
        {
          provide: getRepositoryToken(GPSData),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Carrier),
          useClass: Repository,
        },
        {
          provide: KafkaProducerService,
          useValue: mockKafkaProducer, // Use the mock Kafka producer
        },
      ],
    }).compile();

    service = module.get<GPSService>(GPSService);
    gpsRepository = module.get<Repository<GPSData>>(getRepositoryToken(GPSData));
    carrierRepository = module.get<Repository<Carrier>>(getRepositoryToken(Carrier));
    kafkaProducer = module.get<KafkaProducerService>(KafkaProducerService);
  });

  it('should handle GPS update with valid data', async () => {
    const mockCarrier = { id: '123', name: 'Test Carrier' };
    const mockGpsData = {
      carrierId: '123',
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: '2024-03-20T12:00:00Z',
    };

    jest.spyOn(carrierRepository, 'findOne').mockResolvedValue(mockCarrier as Carrier);
    jest.spyOn(gpsRepository, 'create').mockReturnValue({} as GPSData);
    jest.spyOn(gpsRepository, 'save').mockResolvedValue({} as GPSData);

    const result = await service.handleGPSUpdate(mockGpsData);
    expect(result).toEqual({ status: 'GPS data received' });
    expect(kafkaProducer.sendMessage).toHaveBeenCalledWith('gps-updates', JSON.stringify(mockGpsData));
  });

  it('should throw BadRequestException for invalid carrier', async () => {
    const mockGpsData = {
      carrierId: 'invalid-id',
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: '2024-03-20T12:00:00Z',
    };

    jest.spyOn(carrierRepository, 'findOne').mockResolvedValue(null);

    await expect(service.handleGPSUpdate(mockGpsData)).rejects.toThrow(
      BadRequestException,
    );
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { GPSController } from './gps.controller';
import { GPSService } from './gps.service';
import { CreateGPSDataDto } from './dto/create-gps-data.dto';

describe('GPSController', () => {
  let controller: GPSController;
  let service: GPSService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GPSController],
      providers: [
        {
          provide: GPSService,
          useValue: {
            handleGPSUpdate: jest.fn().mockResolvedValue({ status: 'GPS data received' }),
          },
        },
      ],
    }).compile();

    controller = module.get<GPSController>(GPSController);
    service = module.get<GPSService>(GPSService);
  });

  it('should update GPS data', async () => {
    const gpsData: CreateGPSDataDto = {
      carrierId: '123',
      latitude: 40.7128,
      longitude: -74.0060,
      timestamp: '2024-03-20T12:00:00Z',
    };

    const result = await controller.updateGPS(gpsData);
    expect(result).toEqual({ status: 'GPS data received' });
    expect(service.handleGPSUpdate).toHaveBeenCalledWith(gpsData);
  });
});

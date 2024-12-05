import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { GPSData } from '../gps/entities/gps-data.entity';
import { Repository } from 'typeorm';
import { Route } from './entities/route.entity';
import { Statistics } from './entities/statistics.entity';
import { CreateGPSDataDto } from 'packages/backend/src/gps/dto/create-gps-data.dto';

@Injectable()
export class AggregationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AggregationService.name);
  private consumer: Consumer;
  private kafka: Kafka;

  constructor(
    private configService: ConfigService,
    @InjectRepository(GPSData)
    private gpsDataRepository: Repository<GPSData>,
    @InjectRepository(Route)
    private routeRepository: Repository<Route>,
    @InjectRepository(Statistics)
    private statisticsRepository: Repository<Statistics>,
  ) {
    this.kafka = new Kafka({
      clientId: 'aggregation-service',
      brokers: [this.configService.get<string>('KAFKA_BROKER') || 'localhost:9092'],
    });
    this.consumer = this.kafka.consumer({ groupId: 'aggregation-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      rebalanceTimeout: 60000,
      maxWaitTimeInMs: 5000,
      retry: {
        initialRetryTime: 100,
        retries: 10,
      },
    });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'gps-updates', fromBeginning: true });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.processMessage(payload);
      },
    });
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }

  private async processMessage(payload: EachMessagePayload) {
    const messageValue = payload.message.value?.toString();
    if (!messageValue) return;

    try {
      const gpsData: CreateGPSDataDto = JSON.parse(messageValue);
      // Process GPS data
      // Example: Update route information, compute statistics
      // Implement map matching and aggregation logic here

      // Placeholder: Log GPS data
      this.logger.log(`Received GPS data: ${messageValue}`);

      // TODO: Implement actual aggregation logic
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`);
    }
  }
}

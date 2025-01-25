import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carrier } from './entities/carrier.entity';
import { CarrierConfiguration } from './entities/carrier-configuration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Carrier,
      CarrierConfiguration
    ]),
  ],
  exports: [TypeOrmModule],
})
export class CarriersModule {} 
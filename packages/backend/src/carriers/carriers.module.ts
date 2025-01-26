import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarriersController } from './carriers.controller';
import { CarriersService } from './carriers.service';
import { Carrier } from './entities/carrier.entity';
import { CarrierConfiguration } from './entities/carrier-configuration.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Carrier,
      CarrierConfiguration
    ]),
  ],
  controllers: [CarriersController],
  providers: [CarriersService],
  exports: [CarriersService],
})
export class CarriersModule {} 
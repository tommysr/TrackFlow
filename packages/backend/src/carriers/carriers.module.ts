import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carrier } from './entities/carrier.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Carrier])],
  exports: [TypeOrmModule],
})
export class CarriersModule {} 
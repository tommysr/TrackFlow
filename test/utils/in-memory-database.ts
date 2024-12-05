// test/helpers/in-memory-database.helper.ts
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { User } from '../../src/auth/entities/user.entity';
import { Shipment } from '../../src/shipments/entities/shipment.entity';
import { ShipmentLocation } from '../../src/shipments/entities/shipment-location.entity';
import { Carrier } from '../../src/carriers/entities/carrier.entity';
import { GPSData } from '../../src/gps/entities/gps-data.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      dropSchema: true,
      entities: [User, Shipment, ShipmentLocation, Carrier, GPSData],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([User, Shipment, ShipmentLocation, Carrier, GPSData]),
  ],
})
export class InMemoryDatabaseModule {}

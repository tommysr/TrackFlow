import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import { User } from '../src/auth/entities/user.entity';
import { Shipment } from '../src/shipments/entities/shipment.entity';
import { ShipmentLocation } from '../src/shipments/entities/shipment-location.entity';
import { Carrier } from '../src/carriers/entities/carrier.entity';
import { GPSData } from '../src/gps/entities/gps-data.entity';

let dataSource: DataSource;

beforeAll(async () => {
  dotenv.config({ path: '.env.test' });
  const configService = new ConfigService();

  dataSource = new DataSource({
    type: 'postgres',
    host: configService.get('DATABASE_HOST'),
    port: configService.get('DATABASE_PORT'),
    username: configService.get('DATABASE_USER'),
    password: configService.get('DATABASE_PASSWORD'),
    database: configService.get('DATABASE_NAME'),
    entities: [User, Shipment, ShipmentLocation, Carrier, GPSData],
    synchronize: true,
  });

  await dataSource.initialize();
});

afterAll(async () => {
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }
});

beforeEach(async () => {
  if (!dataSource || !dataSource.isInitialized) {
    throw new Error('DataSource not initialized');
  }

  // Explicitly truncate all tables
  await dataSource.query(`
    DO $$ 
    DECLARE 
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
}); 
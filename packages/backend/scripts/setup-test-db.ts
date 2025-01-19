import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

async function setupTestDatabase() {
  dotenv.config({ path: '.env.test' });
  const configService = new ConfigService();

  try {
    const connection = new DataSource({
      type: 'postgres',
      host: configService.get('DATABASE_HOST'),
      port: configService.get('DATABASE_PORT'),
      username: configService.get('DATABASE_USER'),
      password: configService.get('DATABASE_PASSWORD'),
      database: 'postgres',
    });

    await connection.initialize();

    // Drop test database if it exists
    await connection.query(`DROP DATABASE IF EXISTS ${configService.get('DATABASE_NAME')}`);
    
    // Create test database
    await connection.query(`CREATE DATABASE ${configService.get('DATABASE_NAME')}`);

    // Connect to the new database to install PostGIS
    await connection.destroy();
    const newConnection = new DataSource({
      type: 'postgres',
      host: configService.get('DATABASE_HOST'),
      port: configService.get('DATABASE_PORT'),
      username: configService.get('DATABASE_USER'),
      password: configService.get('DATABASE_PASSWORD'),
      database: configService.get('DATABASE_NAME'),
    });
    await newConnection.initialize();
    
    // Install PostGIS extension
    await newConnection.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    
    console.log('Test database and PostGIS extension created successfully');
    await newConnection.destroy();
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  }
}

setupTestDatabase(); 
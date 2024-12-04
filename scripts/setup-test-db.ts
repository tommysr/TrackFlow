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
    
    console.log('Test database created successfully');
    await connection.destroy();
    
    process.exit(0);
  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  }
}

setupTestDatabase(); 
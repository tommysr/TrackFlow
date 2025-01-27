import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { join } from 'path';

dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
});

const rootDir = join(__dirname, '..');

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: +process.env.DATABASE_PORT,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  synchronize: false,
  dropSchema: process.env.NODE_ENV === 'test' ? true : false,
  logging: true,
  logger: 'file',
  entities: [join(rootDir, '**/entities/*.entity.{ts,js}')],
  migrations: [join(rootDir, 'migrations/**/*.ts')],
  subscribers: [join(rootDir, 'subscriber/**/*.ts')],
  migrationsTableName: 'migrations',
});

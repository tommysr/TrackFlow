import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { CarriersModule } from './carriers/carriers.module';

const configFactory = () => {
  console.log('Environment variables:');
  console.log('GEOCODING_API_KEY:', process.env.GEOCODING_API_KEY);
  console.log('DATABASE_HOST:', process.env.DATABASE_HOST);
  console.log('DATABASE_PORT:', process.env.DATABASE_PORT);
  console.log('DATABASE_USER:', process.env.DATABASE_USER);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('ENV_FILE:', process.env.NODE_ENV == 'test' ? '.env.test' : '.env');
  console.log('JWT_SECRET:', process.env.JWT_SECRET);
  console.log('JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);

  return {
    geocoding: {
      apiKey: process.env.GEOCODING_API_KEY,
    },
    routing: {
      apiKey: process.env.ROUTING_API_KEY,
    },
    tracking: {
      tokenSecret: process.env.TRACKING_TOKEN_SECRET,
    },
    database: {
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT,
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      databaseName: process.env.DATABASE_NAME,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
  };
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV == 'test' ? '.env.test' : '.env',
      load: [configFactory],
      ignoreEnvFile: false,
      cache: false,
      expandVariables: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        console.log('ConfigService values:');
        console.log('database.host:', configService.get('database.host'));
        console.log('database.port:', configService.get('database.port'));
        console.log('database.username:', configService.get('database.username'));
        console.log('synchronize:', process.env.NODE_ENV == 'test');

        return {
          type: 'postgres',
          host: configService.get('database.host'),
          port: configService.get('database.port'),
          username: configService.get('database.username'),
          password: configService.get('database.password'),
          database: configService.get('database.databaseName'),
          autoLoadEntities: true,
          synchronize: process.env.NODE_ENV == 'test',
        };
      },
      inject: [ConfigService],
    }),
    AuthModule,
    ShipmentsModule,
    CarriersModule,
  ],
  providers: [],
})
export class AppModule {}

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TestDatabaseModule } from '../../test/helpers/database.helper';
import { Shipment } from '../shipments/entities/shipment.entity';
import { ShipmentLocation } from '../shipments/entities/shipment-location.entity';
import { Carrier } from '../carriers/entities/carrier.entity';
import { GPSData } from '../gps/entities/gps-data.entity';
import { JwtModule } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
        TestDatabaseModule,
        TypeOrmModule.forFeature([User, Shipment, ShipmentLocation, Carrier, GPSData]),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET'),
            signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') },
          }),
          inject: [ConfigService],
        }),
      ],
      providers: [AuthService],
    }).compile();

    service = module.get<AuthService>(AuthService);
  }, 30000);

  it('should create a user', async () => {
    const user = await service.registerUser({
      username: 'testuser',
      password: 'password123',
      role: UserRole.CUSTOMER,
    });

    expect(user).toBeDefined();
    expect(user.username).toBe('testuser');
    expect(user.role).toBe(UserRole.CUSTOMER);
  });

  it('should throw on duplicate username', async () => {
    await service.registerUser({
      username: 'testuser2',
      password: 'password123',
      role: UserRole.CUSTOMER,
    });

    await expect(
      service.registerUser({
        username: 'testuser2',
        password: 'password123',
        role: UserRole.CUSTOMER,
      }),
    ).rejects.toThrow('Username already exists');
  });

  it('should validate user credentials', async () => {
    await service.registerUser({
      username: 'testuser3',
      password: 'password123',
      role: UserRole.CUSTOMER,
    });

    const validUser = await service.loginUser({
      username: 'testuser3',
      password: 'password123',
    });
    expect(validUser).toBeDefined();
    expect(validUser.accessToken).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    await expect(
      service.loginUser({
        username: 'nonexistent',
        password: 'wrongpass',
      }),
    ).rejects.toThrow('Invalid credentials');
  });
}); 
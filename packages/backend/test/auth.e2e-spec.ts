import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/auth/entities/user.entity';
import { DataSource } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { CreateGPSDataDto } from 'packages/backend/src/gps/dto/create-gps-data.dto';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeEach(async () => {
    console.log('beforeEach');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    console.log('Connected to database:', dataSource.options.database);
    console.log('Environment:', process.env.DATABASE_NAME);
  });

  afterEach(async () => {
    await app.close();
  });

  it('/auth/register (POST)', async () => {
    const userRepository = dataSource.getRepository(User);
    const usersBefore = await userRepository.find();
    const password = 'password123';
    expect(usersBefore.length).toBe(0);

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'testuser',
        password: password,
        role: UserRole.CUSTOMER,
      });

    expect(response.status).toBe(201);
    expect(response.body.username).toBe('testuser');
    expect(response.body.role).toBe(UserRole.CUSTOMER);

    const { passwordHash } = await userRepository.findOne({
      where: { username: 'testuser' },
    });

    expect(await bcrypt.compare(password, passwordHash)).toBe(true);

    const usersAfter = await userRepository.find();
    expect(usersAfter.length).toBe(1);
  });

  it('/auth/login (POST)', async () => {
    const userRepository = dataSource.getRepository(User);

    // Register a test user first
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'logintest',
        password: 'password123',
        role: UserRole.CUSTOMER,
      });
    expect(registerResponse.status).toBe(201);

    // Test login and JWT
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'logintest',
        password: 'password123',
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.accessToken).toBeDefined();

    const gpsData: CreateGPSDataDto = {
      carrierId: uuidv4(),
      latitude: 123.456,
      longitude: 78.91,
      timestamp: new Date().toISOString(),
    };

    // Verify JWT works by accessing a protected route
    const protectedResponse = await request(app.getHttpServer())
      .post('/gps/update') // Replace with your actual protected route
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send(gpsData);

    expect(protectedResponse.status).toBe(400); // Or whatever status you expect
  });

  it('should reject invalid JWT', async () => {
    const invalidToken = 'invalid.jwt.token';

    const response = await request(app.getHttpServer())
      .post('/gps/update') // Replace with your actual protected route
      .set('Authorization', `Bearer ${invalidToken}`);

    expect(response.status).toBe(401);
  });

  it('should reject expired JWT', async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(JwtService)
      .useFactory({
        factory: () => {
          return new JwtService({
            secret: 'test_secret',
            signOptions: { expiresIn: '10s' },
          });
        },
      })
      .compile();

    const modifiedApp = moduleFixture.createNestApplication();
    await modifiedApp.init();

    // Register and login to get a token
    await request(modifiedApp.getHttpServer()).post('/auth/register').send({
      username: 'expiredtest',
      password: 'password123',
      role: UserRole.CUSTOMER,
    });

    const loginResponse = await request(modifiedApp.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'expiredtest',
        password: 'password123',
      });

    // Wait for token to expire (if JWT_EXPIRES_IN is set to a very short duration in test env)
    await new Promise((resolve) => setTimeout(resolve, 11000)); // Adjust timeout based on your JWT_EXPIRES_IN

    const response = await request(modifiedApp.getHttpServer())
      .post('/gps/update') // Replace with your actual protected route
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

    expect(response.status).toBe(401);
  }, 20000);
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/auth/entities/user.entity';
import { DataSource } from 'typeorm';
import { User } from '../src/auth/entities/user.entity';
import { ConfigModule } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/auth/register (POST)', async () => {
    // Verify no users exist before test
    const userRepository = app.get(DataSource).getRepository(User);
    const usersBefore = await userRepository.find();
    expect(usersBefore.length).toBe(0);

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'testuser',
        password: 'password123',
        role: UserRole.CUSTOMER,
      });

    expect(response.status).toBe(201);
    expect(response.body.username).toBe('testuser');
    expect(response.body.role).toBe(UserRole.CUSTOMER);
    const hash = await bcrypt.hash('password123', 10);
    expect(
      await bcrypt.compare('password123', response.body.passwordHash),
    ).toBe(true);

    // Verify only one user exists after test
    const usersAfter = await userRepository.find();
    expect(usersAfter.length).toBe(1);
  });

  it('/auth/login (POST)', async () => {
    // Verify no users exist before test
    const userRepository = app.get(DataSource).getRepository(User);
    const usersBefore = await userRepository.find();
    expect(usersBefore.length).toBe(1);

    // Register a user
    await request(app.getHttpServer()).post('/auth/register').send({
      username: 'logintest',
      password: 'password123',
      role: UserRole.CUSTOMER,
    });

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'logintest',
        password: 'password123',
      });

    expect(loginResponse.status).toBe(200);
  });
});

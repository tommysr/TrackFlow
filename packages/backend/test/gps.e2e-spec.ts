// import { Test, TestingModule } from '@nestjs/testing';
// import { INestApplication } from '@nestjs/common';
// import * as request from 'supertest';
// import { AppModule } from '../src/app.module';
// import { DataSource } from 'typeorm';
// import { Carrier } from '../src/carriers/entities/carrier.entity';
// import { User } from '../src/auth/entities/user.entity';
// import { UserRole } from '../src/auth/entities/user.entity';

// describe('GPS (e2e)', () => {
//   let app: INestApplication;
//   let dataSource: DataSource;
//   let jwtToken: string;

//   beforeEach(async () => {
//     const moduleFixture: TestingModule = await Test.createTestingModule({
//       imports: [AppModule],
//     }).compile();

//     app = moduleFixture.createNestApplication();
//     await app.init();
    
//     dataSource = app.get(DataSource);

//     // Create a test user and get JWT token
//     await request(app.getHttpServer())
//       .post('/auth/register')
//       .send({
//         username: 'testuser',
//         password: 'password123',
//         role: UserRole.CUSTOMER,
//       });

//     const loginResponse = await request(app.getHttpServer())
//       .post('/auth/login')
//       .send({
//         username: 'testuser',
//         password: 'password123',
//       });

//     jwtToken = loginResponse.body.accessToken;
//   });

//   afterEach(async () => {
//     await app.close();
//   });

//   it('/gps/update (POST) - should update GPS data', async () => {
//     // Create a test carrier first
//     const carrierRepo = dataSource.getRepository(Carrier);
//     const carrier = await carrierRepo.save({
//       name: 'Test Carrier',
//       contactInfo: 'test@test.com'
//     });

//     const gpsData = {
//       carrierId: carrier.id,
//       latitude: 40.7128,
//       longitude: -74.0060,
//       timestamp: new Date().toISOString(),
//     };

//     return request(app.getHttpServer())
//       .post('/gps/update')
//       .set('Authorization', `Bearer ${jwtToken}`)
//       .send(gpsData)
//       .expect(201)
//       .expect((res) => {
//         expect(res.body.status).toBe('GPS data received');
//       });
//   });

//   it('/gps/update (POST) - should reject unauthorized request', async () => {
//     const gpsData = {
//       carrierId: 'some-id',
//       latitude: 40.7128,
//       longitude: -74.0060,
//       timestamp: new Date().toISOString(),
//     };

//     return request(app.getHttpServer())
//       .post('/gps/update')
//       .send(gpsData)
//       .expect(401);
//   });
// }); 
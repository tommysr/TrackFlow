import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors({
    origin: 'http://localhost:3000', // Replace with your frontend's origin
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // If you need to send cookies or authentication headers
    allowedHeaders: 'Content-Type, Authorization', // Adjust based on your needs
  });

  const config = new DocumentBuilder()
    .setTitle('Logistics API')
    .setDescription(`
      API for managing logistics operations including:
      - Shipment management
      - Route optimization
      - Carrier operations
      - GPS tracking
      
      All protected endpoints require Bearer token authentication.
    `)
    .setVersion('1.0')
    .addBearerAuth(
      { 
        type: 'http', 
        scheme: 'bearer', 
        bearerFormat: 'JWT',
        description: 'Enter your JWT token'
      },
      'JWT-auth'
    )
    .addTag('carriers', 'Carrier management operations')
    .addTag('shipments', 'Shipment management operations')
    .addTag('routes', 'Route optimization and tracking')
    .addTag('auth', 'Authentication and authorization')
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.NEST_PORT ?? 5000);
}
bootstrap();

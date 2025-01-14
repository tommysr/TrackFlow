import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { IcpStrategy } from './strategies/icp.strategy';
import { IcpUser } from './entities/icp.user.entity';
import { ChallengeService } from './services/challenge.service';
import { ShipmentGuard } from './guards/shipment.guard';
import { RolesGuard } from './guards/roles.guard';
import { ShipmentsModule } from '../shipments/shipments.module';
import { Shipper } from './entities/shipper.entity';
import { ShipmentSyncGuard } from './guards/shipment.sync.guard';
@Module({
  imports: [
    TypeOrmModule.forFeature([IcpUser, Shipper]),
    PassportModule,
    forwardRef(() => ShipmentsModule),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') },
      }),
      inject: [ConfigService],
      imports: [ConfigModule],
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    IcpStrategy,
    ChallengeService,
    ShipmentGuard,
    ShipmentSyncGuard,
    RolesGuard
  ],
  controllers: [AuthController],
  exports: [AuthService, ShipmentGuard, RolesGuard, TypeOrmModule.forFeature([IcpUser, Shipper]), JwtModule],
})
export class AuthModule {} 
import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([IcpUser]),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') },
      }),
      inject: [ConfigService],
      imports: [ConfigModule],
    }),
  ],
  providers: [AuthService, JwtStrategy, IcpStrategy, ChallengeService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {} 
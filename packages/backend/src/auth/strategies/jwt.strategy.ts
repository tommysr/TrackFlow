import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './jwt-payload.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IcpUser } from '../entities/icp.user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    
    @InjectRepository(IcpUser)
    private readonly icpUserRepository: Repository<IcpUser>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
    this.logger.log('JWT Strategy initialized');
    this.logger.log('JWT_SECRET:', configService.get<string>('JWT_SECRET'));
  }

  async validate(payload: JwtPayload) {
    this.logger.log('JWT Strategy - validate called with payload:', payload);

    const user = await this.icpUserRepository.findOne({
      where: { principal: payload.principal },
    });

    this.logger.log('JWT Strategy - found user:', user.principal);

    if (!user) {
      this.logger.error('JWT Strategy - User not found for principal:', payload.principal);
      throw new UnauthorizedException();
    }

    return user;
  }
}

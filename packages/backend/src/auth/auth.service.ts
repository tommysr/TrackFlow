import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from './strategies/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { IcpPayload } from './strategies/icp-payload.interface';
import { IcpUser, UserRole } from './entities/icp.user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(IcpUser)
    private readonly icpUserRepository: Repository<IcpUser>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async authorizeIcpSession(
    icpPayload: IcpPayload,
  ): Promise<{ accessToken: string }> {
    const icpUser = await this.validateIcpPayload(icpPayload);
    const jwtPayload: JwtPayload = {
      sub: icpUser.principal,
      principal: icpUser.principal
    };
    const options = {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    };


    console.log('options', options);
    return { accessToken: this.jwtService.sign(jwtPayload, options) };
  }

  async validateIcpPayload(icpPayload: IcpPayload): Promise<IcpUser> {
    try {
      let icpUser = await this.icpUserRepository.findOne({
        where: { principal: icpPayload.principal },
      });

      if (!icpUser) {
        icpUser = this.icpUserRepository.create({
          principal: icpPayload.principal,
          roles: [UserRole.USER],
        });
        await this.icpUserRepository.save(icpUser);
      }

      return icpUser;
    } catch (error) {
      console.error('Error validating ICP payload:', error);
      throw new UnauthorizedException('Invalid ICP authentication');
    }
  }
}

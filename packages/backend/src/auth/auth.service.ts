import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from './strategies/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { IcpPayload } from './strategies/icp-payload.interface';
import { IcpUser, UserRole } from './entities/icp.user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(IcpUser)
    private readonly icpUserRepository: Repository<IcpUser>,
    private readonly jwtService: JwtService,
  ) {}

  async authorizeIcpSession(
    icpPayload: IcpPayload,
  ): Promise<{ accessToken: string }> {
    const icpUser = await this.validateIcpPayload(icpPayload);
    const jwtPayload: JwtPayload = {
      sub: icpUser.principal,
      principal: icpUser.principal,
      role: icpUser.role,
    };
    return { accessToken: this.jwtService.sign(jwtPayload) };
  }

  async validateIcpPayload(icpPayload: IcpPayload): Promise<IcpUser> {
    try {
      let icpUser = await this.icpUserRepository.findOne({
        where: { principal: icpPayload.principal },
      });

      if (!icpUser) {
        icpUser = this.icpUserRepository.create({
          principal: icpPayload.principal,
          role: UserRole.UNKNOWN,
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

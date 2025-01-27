import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from './strategies/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';
import { IcpUser, UserRole } from './entities/icp.user.entity';
import { ConfigService } from '@nestjs/config';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { IcpAuthResponseDto } from './dto/icp-auth-response.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { IcpPayload } from './dto/icp-auth.dto';

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
  ): Promise<IcpAuthResponseDto> {
    const icpUser = await this.validateIcpPayload(icpPayload);
    const jwtPayload: JwtPayload = {
      sub: icpUser.principal,
      principal: icpUser.principal,
    };
    const options = {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    };

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

  async updateProfile(
    principal: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const user = await this.icpUserRepository.findOne({ where: { principal } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    Object.assign(user, updateProfileDto);
    const updatedUser = await this.icpUserRepository.save(user);

    return {
      name: updatedUser.name,
      contact: updatedUser.contact,
      roles: updatedUser.roles,
    };
  }

  async getProfile(principal: string): Promise<ProfileResponseDto> {
    const user = await this.icpUserRepository.findOne({ where: { principal } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return {
      name: user.name,
      contact: user.contact,
      roles: user.roles,
    };
  }
}

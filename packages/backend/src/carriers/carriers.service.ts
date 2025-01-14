import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Carrier } from './entities/carrier.entity';
import { UpdateCarrierDto } from './dto/update-carrier.dto';
import { IcpUser, UserRole } from '../auth/entities/icp.user.entity';

@Injectable()
export class CarriersService {
  constructor(
    @InjectRepository(Carrier)
    private readonly carrierRepository: Repository<Carrier>,
  ) {}

  async updateFuelInfo(
    updateCarrierDto: UpdateCarrierDto,
    user: IcpUser,
  ): Promise<Carrier> {
    const carrier = await this.carrierRepository.findOne({ where: { identity: { principal: user.principal } } });

    if (!carrier && user.role !== UserRole.ADMIN) {
      throw new NotFoundException('You are not authorized to update this carrier');
    }

    Object.assign(carrier, updateCarrierDto);
    return this.carrierRepository.save(carrier);
  }
}
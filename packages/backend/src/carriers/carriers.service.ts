import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Carrier } from './entities/carrier.entity';
import { UpdateCarrierDto } from './dto/update-carrier.dto';
import { IcpUser, UserRole } from '../auth/entities/icp.user.entity';
import { CarrierConfiguration } from './entities/carrier-configuration.entity';

@Injectable()
export class CarriersService {
  constructor(
    @InjectRepository(Carrier)
    private readonly carrierRepository: Repository<Carrier>,
    @InjectRepository(CarrierConfiguration)
    private readonly carrierConfigurationRepository: Repository<CarrierConfiguration>,
  ) {}

  async updateFuelInfo(
    updateCarrierDto: UpdateCarrierDto,
    user: IcpUser,
  ): Promise<UpdateCarrierDto> {
    const carrier = await this.carrierRepository.findOne({
      where: { principal: user.principal },
    });

    if (!carrier) {
      throw new NotFoundException('Carrier not found');
    }

    let carrierConfiguration =
      await this.carrierConfigurationRepository.findOne({
        where: { carrier: { principal: user.principal } },
      });

    if (!carrierConfiguration) {
      carrierConfiguration = new CarrierConfiguration();
      carrierConfiguration.carrier = carrier;
      carrierConfiguration =
        this.carrierConfigurationRepository.create(updateCarrierDto);
    } else {
      Object.assign(carrierConfiguration, updateCarrierDto);
    }

    const savedCarrierConfiguration =
      await this.carrierConfigurationRepository.save(carrierConfiguration);

    return {
      fuelEfficiency: savedCarrierConfiguration.fuelEfficiency,
      fuelCostPerLiter: savedCarrierConfiguration.fuelCostPerLiter,
    };
  }
}

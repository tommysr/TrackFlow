import { Controller, Patch, Body, UseGuards, Param } from '@nestjs/common';
import { CarriersService } from './carriers.service';
import { UpdateCarrierDto } from './dto/update-carrier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/icp.user.entity';
import { User } from '../auth/decorators/user.decorator';
import { IcpUser } from '../auth/entities/icp.user.entity';

@Controller('carriers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CarriersController {
  constructor(private readonly carriersService: CarriersService) {}

  @Patch('/update-fuel-info')
  async updateFuelInfo(
    @Body() updateCarrierDto: UpdateCarrierDto,
    @User() user: IcpUser,
  ) {
    return this.carriersService.updateFuelInfo(updateCarrierDto, user);
  }
} 
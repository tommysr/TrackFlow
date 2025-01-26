import { Controller, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { CarriersService } from './carriers.service';
import { UpdateCarrierDto } from './dto/update-carrier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User } from '../auth/decorators/user.decorator';
import { IcpUser } from '../auth/entities/icp.user.entity';
import { Carrier } from './entities/carrier.entity';

@ApiTags('carriers')
@Controller('carriers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CarriersController {
  constructor(private readonly carriersService: CarriersService) {}

  @Patch('/update-fuel-info')
  @ApiOperation({ 
    summary: 'Update carrier fuel information',
    description: 'Updates the fuel efficiency and cost information for the authenticated carrier'
  })
  @ApiResponse({ 
    status: 200, 
    type: Carrier, 
    description: 'Carrier fuel information updated successfully'
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Carrier not found'
  })
  @ApiResponse({ 
    status: 403, 
    description: 'Forbidden - User is not authorized to update this carrier'
  })
  @ApiBody({ 
    type: UpdateCarrierDto,
    description: 'Fuel efficiency and cost information'
  })
  async updateFuelInfo(
    @Body() updateCarrierDto: UpdateCarrierDto,
    @User() user: IcpUser,
  ): Promise<Carrier> {
    return this.carriersService.updateFuelInfo(updateCarrierDto, user);
  }
} 
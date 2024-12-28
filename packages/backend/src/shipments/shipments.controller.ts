import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { Shipment } from './entities/shipment.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ShipmentGuard } from '../auth/guards/shipment.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IcpUser, UserRole } from '../auth/entities/icp.user.entity';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { User } from 'src/auth/decorators/user.decorator';
import { ShipmentResponseDto } from './dto/shipment-response.dto';

@Controller('shipments')
@UseGuards(JwtAuthGuard)
export class ShipmentsController {
  private readonly logger = new Logger(ShipmentsController.name);

  constructor(private readonly shipmentsService: ShipmentsService) {}

  // Shipper retrieves their shipments
  @Get('my-shipments')
  // @Roles(UserRole.SHIPPER)
  async getMyShipments(@User() user: { principal: string }): Promise<ShipmentResponseDto[]> {
    return this.shipmentsService.findByShipper(user.principal);
  }

  // Carrier retrieves their assigned shipments
  @Get('assigned-shipments')
  @Roles(UserRole.CARRIER, UserRole.ADMIN)
  async getAssignedShipments(@User() user: IcpUser): Promise<Shipment[]> {
    return this.shipmentsService.findByCarrier(user.principal);
  }

  // Update shipment status (only carrier or admin)
  @Post(':id/status')
  @UseGuards(ShipmentGuard)
  @Roles(UserRole.CARRIER, UserRole.ADMIN)
  async updateShipmentStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ): Promise<Shipment> {
    // Optionally, you can re-validate ownership here if necessary
    return this.shipmentsService.updateStatus(id, updateStatusDto);
  }
}

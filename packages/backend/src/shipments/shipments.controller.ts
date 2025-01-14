import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ShipmentsService } from './shipments.service';

import { ShipmentGuard } from '../auth/guards/shipment.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IcpUser, UserRole } from '../auth/entities/icp.user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { User } from 'src/auth/decorators/user.decorator';
import {
  BoughtShipmentResponseDto,
  PendingShipmentResponseDto,
} from './dto/shipment-response.dto';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { ShipmentSyncGuard } from 'src/auth/guards/shipment.sync.guard';

@Controller('shipments')
@UseGuards(JwtAuthGuard)
export class ShipmentsController {
  private readonly logger = new Logger(ShipmentsController.name);

  constructor(private readonly shipmentsService: ShipmentsService) {}

  // Create a shipment, only shipper
  @Post('create')
  @Roles(UserRole.SHIPPER)
  @UseGuards(ShipmentSyncGuard)
  @UseGuards(ShipmentGuard)
  async createShipment(
    @Body() createShipmentDto: CreateShipmentDto,
  ): Promise<{ trackingToken: string }> {
    return this.shipmentsService.createShipment(createShipmentDto);
  }

  @Post(':id/ready-for-pickup')
  @Roles(UserRole.SHIPPER)
  @UseGuards(ShipmentSyncGuard)
  @UseGuards(ShipmentGuard)
  async markReadyForPickup(
    @Param('id') id: number,
    @User() user: IcpUser,
  ): Promise<boolean> {
    return this.shipmentsService.markReadyForPickup(id, user.principal);
  }

  @Get('my-pending')
  @UseGuards(ShipmentSyncGuard)
  async getShipperPendingShipments(
    @User() user: IcpUser,
  ): Promise<PendingShipmentResponseDto[]> {
    return this.shipmentsService.findShipperPendingShipments(user.principal);
  }

  // Tab 2: Bought shipments with proposed dates
  @Get('my-bought')
  @UseGuards(ShipmentSyncGuard)
  async getMyBoughtShipments(
    @User() user: IcpUser,
  ): Promise<BoughtShipmentResponseDto[]> {
    return this.shipmentsService.findBoughtShipments(user.principal);
  }
}

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
  GeocodeResponseDto,
  PendingShipmentResponseDto,
} from './dto/shipment-response.dto';
import { GeocodeAddressDto, SetAddressDto } from './dto/create-shipment.dto';
import { ShipmentSyncGuard } from 'src/auth/guards/shipment.sync.guard';
import { GetAddressesDto } from './dto/get-addresses.dto';

@Controller('shipments')
@UseGuards(JwtAuthGuard)
export class ShipmentsController {
  private readonly logger = new Logger(ShipmentsController.name);

  constructor(private readonly shipmentsService: ShipmentsService) {}

  // Create a shipment, only shipper
  @Post('set-addresses')
  @Roles(UserRole.SHIPPER)
  @UseGuards(ShipmentSyncGuard)
  @UseGuards(ShipmentGuard)
  async setAddresses(
    @Body() setAddressDto: SetAddressDto,
  ): Promise<{trackingToken: string}> {
    return this.shipmentsService.setAddress(setAddressDto);
  }

  @Post('geocode')
  async geocodeAddress(
    @Body() geocodeAddressDto: GeocodeAddressDto,
  ): Promise<GeocodeResponseDto> {
    return this.shipmentsService.geocodeAddress(geocodeAddressDto);
  }

  @Get('get-addresses/:id')
  @Roles(UserRole.SHIPPER)
  @UseGuards(ShipmentSyncGuard)
  @UseGuards(ShipmentGuard)
  async getAddresses(
    @Param('id') id: number,
  ): Promise<GeocodeResponseDto> {
    return this.shipmentsService.getAddresses(id);
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


  @Get('my-carried')
  @UseGuards(ShipmentSyncGuard)
  async getMyCarriedShipments(
    @User() user: IcpUser,
  ): Promise<BoughtShipmentResponseDto[]> {
    return this.shipmentsService.findCarriedShipments(user.principal);
  }

  // Set Pickup Date
  @Post(':id/pickup-date')
  @Roles(UserRole.CARRIER, UserRole.ADMIN)
  @UseGuards(ShipmentGuard)
  async setPickupDate(
    @Param('id') id: number,
    @Body() { pickupDate }: { pickupDate: Date },
  ): Promise<boolean> {
    return this.shipmentsService.setPickupDate(id, pickupDate);
  }

  // Set Delivery Date
  @Post(':id/delivery-date')
  @Roles(UserRole.CARRIER, UserRole.ADMIN)
  @UseGuards(ShipmentGuard)
  async setDeliveryDate(
    @Param('id') id: number,
    @Body() { deliveryDate }: { deliveryDate: Date },
  ): Promise<boolean> {
    return this.shipmentsService.setDeliveryDate(id, deliveryDate);
  }
}

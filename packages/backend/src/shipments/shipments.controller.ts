import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,

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
import { ShipmentWindowsDto } from './dto/time-window.dto';
import { SetStopDateDto } from './dto/set-stop-date.dto';

@Controller('shipments')
@UseGuards(JwtAuthGuard)
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get('/by-canister-id/:id')
  @UseGuards(ShipmentGuard)
  async getByCanisterId(@Param('id') id: string) {
    return this.shipmentsService.findOneById(id);
  }

  // Create a shipment with addresses
  @Post('create')
  @UseGuards(ShipmentGuard)
  @UseGuards(ShipmentSyncGuard)
  @Roles(UserRole.SHIPPER)
  async createWithAddresses(@Body() setAddressDto: SetAddressDto) {
    return this.shipmentsService.setAddress(
      setAddressDto.shipmentId,
      setAddressDto,
    );
  }

  // Update addresses
  @Put(':id/addresses')
  @UseGuards(ShipmentGuard)
  @UseGuards(ShipmentSyncGuard)
  @Roles(UserRole.SHIPPER)
  async setAddresses(
    @Param('id') id: string,
    @Body() setAddressDto: SetAddressDto,
  ): Promise<{ trackingToken: string }> {
    return this.shipmentsService.setAddress(id, setAddressDto);
  }

  // Set time windows
  @Put(':id/time-windows')
  @UseGuards(ShipmentGuard)
  @UseGuards(ShipmentSyncGuard)
  @Roles(UserRole.SHIPPER)
  async setTimeWindows(
    @Param('id') id: string,
    @Body() windows: ShipmentWindowsDto,
  ): Promise<void> {
    return this.shipmentsService.setTimeWindows(id, windows);
  }

  @Get(':id/addresses')
  async getAddresses(@Param('id') id: string): Promise<GeocodeResponseDto> {
    return this.shipmentsService.getAddresses(id);
  }

  @Get(':id/time-windows')
  async getTimeWindows(@Param('id') id: string): Promise<ShipmentWindowsDto> {
    return this.shipmentsService.getTimeWindows(id);
  }

  // // // Mark ready for pickup
  // // @Put(':id/status/ready')
  // // @Roles(UserRole.SHIPPER)
  // // @UseGuards(ShipmentSyncGuard)
  // // @UseGuards(ShipmentGuard)
  // // async markReadyForPickup(@Param('id') id: string): Promise<void> {
  // //   return this.shipmentsService.markReadyForPickup(id);
  // // }

  @Post('geocode')
  @UseGuards(ShipmentSyncGuard)
  async geocodeAddress(
    @Body() geocodeAddressDto: GeocodeAddressDto,
  ): Promise<GeocodeResponseDto> {
    return this.shipmentsService.geocodeAddress(geocodeAddressDto);
  }

  @Get('my-pending')
  @UseGuards(ShipmentSyncGuard)
  async getShipperPendingShipments(
    @User() user: IcpUser,
  ): Promise<PendingShipmentResponseDto[]> {
    return this.shipmentsService.findShipperPendingShipments(user.principal);
  }

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

  // // // Set Pickup Date
  // // @Put(':id/pickup-date')
  // // @Roles(UserRole.CARRIER, UserRole.ADMIN)
  // // @UseGuards(ShipmentGuard)
  // // async setPickupDate(
  // //   @Param('id') id: string,
  // //   @Body() setPickupDateDto: SetStopDateDto,
  // // ): Promise<boolean> {
  // //   return this.shipmentsService.setPickupDate(id, setPickupDateDto.stopDate);
  // // }

  // // // Set Delivery Date
  // // @Put(':id/delivery-date')
  // // @Roles(UserRole.CARRIER, UserRole.ADMIN)
  // // @UseGuards(ShipmentGuard)
  // // async setDeliveryDate(
  // //   @Param('id') id: string,
  // //   @Body() setDeliveryDateDto: SetStopDateDto,
  // // ): Promise<boolean> {
  // //   return this.shipmentsService.setDeliveryDate(
  // //     id,
  // //     setDeliveryDateDto.stopDate,
  // //   );
  // // }
}

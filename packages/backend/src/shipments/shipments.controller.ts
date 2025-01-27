import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ShipmentsService } from './shipments.service';
import { ShipmentGuard } from '../auth/guards/shipment.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { IcpUser, UserRole } from '../auth/entities/icp.user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt.guard';
import { User } from 'src/auth/decorators/user.decorator';
import {
  BoughtShipmentResponseDto,
  CarriedShipmentResponseDto,
  GeocodeResponseDto,
  InTransitShipmentResponseDto,
  PendingShipmentResponseDto,
} from './dto/shipment-response.dto';
import { GeocodeAddressDto, SetAddressDto } from './dto/create-shipment.dto';
import { ShipmentSyncGuard } from 'src/auth/guards/shipment.sync.guard';
import { ShipmentWindowsDto } from './dto/time-window.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Shipment } from './entities/shipment.entity';
import { PublicShipmentTrackingDto } from './dto/public-shipment-tracking.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('shipments')
@Controller('shipments')
@UseGuards(JwtAuthGuard)
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Get('/by-canister-id/:id')
  @ApiOperation({ summary: 'Get shipment by canister ID' })
  @ApiResponse({ status: 200, type: Shipment })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  @ApiParam({ name: 'id', type: String, description: 'Canister shipment ID' })
  @UseGuards(ShipmentGuard)
  @UseGuards(ShipmentSyncGuard)
  @Roles(UserRole.SHIPPER)
  async getByCanisterId(@Param('id') id: string) {
    return this.shipmentsService.findOneById(id);
  }

  // Create a shipment with addresses
  @Post('create')
  @ApiOperation({ summary: 'Create a new shipment with addresses' })
  @ApiResponse({ status: 201, description: 'Shipment created successfully' })
  @ApiBody({ type: SetAddressDto })
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
  @ApiOperation({ summary: 'Update shipment addresses' })
  @ApiResponse({ status: 200, description: 'Addresses updated successfully' })
  @ApiParam({ name: 'id', type: String, description: 'Shipment ID' })
  @ApiBody({ type: SetAddressDto })
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
  @ApiOperation({ summary: 'Set shipment time windows' })
  @ApiResponse({
    status: 200,
    description: 'Time windows updated successfully',
  })
  @ApiParam({ name: 'id', type: String, description: 'Shipment ID' })
  @ApiBody({ type: ShipmentWindowsDto })
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
  @ApiOperation({ summary: 'Get addresses for a shipment' })
  @ApiResponse({
    status: 200,
    type: GeocodeResponseDto,
    description: 'Returns pickup and delivery addresses',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Shipment ID',
  })
  @UseGuards(ShipmentGuard)
  @UseGuards(ShipmentSyncGuard)
  @Roles(UserRole.SHIPPER)
  async getAddresses(@Param('id') id: string): Promise<GeocodeResponseDto> {
    return this.shipmentsService.getAddresses(id);
  }

  @Get(':id/time-windows')
  @ApiOperation({
    summary: 'Get pickup and delivery time windows for a shipment',
  })
  @ApiResponse({
    status: 200,
    type: ShipmentWindowsDto,
    description: 'Returns pickup and delivery time windows',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Shipment ID',
  })
  @UseGuards(ShipmentGuard)
  @UseGuards(ShipmentSyncGuard)
  @Roles(UserRole.SHIPPER)
  async getTimeWindows(@Param('id') id: string): Promise<ShipmentWindowsDto> {
    return this.shipmentsService.getTimeWindows(id);
  }

  @Post('geocode')
  @ApiOperation({ summary: 'Geocode an address to get coordinates' })
  @ApiResponse({
    status: 200,
    type: GeocodeResponseDto,
    description: 'Returns geocoded address with coordinates',
  })
  @ApiBody({ type: GeocodeAddressDto })
  async geocodeAddress(
    @Body() geocodeAddressDto: GeocodeAddressDto,
  ): Promise<GeocodeResponseDto> {
    return this.shipmentsService.geocodeAddress(geocodeAddressDto);
  }

  @Get('my-pending')
  @ApiOperation({ summary: 'Get pending shipments for authenticated shipper' })
  @ApiResponse({ status: 200, type: [PendingShipmentResponseDto] })
  @UseGuards(ShipmentSyncGuard)
  @Roles(UserRole.SHIPPER)
  async getShipperPendingShipments(
    @User() user: IcpUser,
  ): Promise<PendingShipmentResponseDto[]> {
    return this.shipmentsService.findShipperPendingShipments(user.principal);
  }

  @Get('my-bought')
  @ApiOperation({ summary: 'Get bought shipments for authenticated carrier' })
  @ApiResponse({ status: 200, type: [BoughtShipmentResponseDto] })
  @UseGuards(ShipmentSyncGuard)
  @Roles(UserRole.SHIPPER)
  async getMyBoughtShipments(
    @User() user: IcpUser,
  ): Promise<BoughtShipmentResponseDto[]> {
    return this.shipmentsService.findBoughtShipments(user.principal);
  }

  @Get('my-in-route')
  @ApiOperation({ summary: 'Get in route shipments for authenticated carrier' })
  @ApiResponse({ status: 200, type: [InTransitShipmentResponseDto] })
  @UseGuards(ShipmentSyncGuard)
  @Roles(UserRole.SHIPPER)
  async getMyInRouteShipments(
    @User() user: IcpUser,
  ): Promise<InTransitShipmentResponseDto[]> {
    return this.shipmentsService.findInRouteShipments(user.principal);
  }

  @Get('my-carried')
  @ApiOperation({ summary: 'Get carried shipments for authenticated carrier' })
  @ApiResponse({ status: 200, type: [BoughtShipmentResponseDto] })
  @UseGuards(ShipmentSyncGuard)
  @Roles(UserRole.CARRIER)
  async getMyCarriedShipments(
    @User() user: IcpUser,
  ): Promise<CarriedShipmentResponseDto[]> {
    return this.shipmentsService.findCarriedShipments(user.principal);
  }

  @Public()
  @Get('tracking')
  async getPublicTracking(
    @Query('token') token: string,
  ): Promise<PublicShipmentTrackingDto> {
    if (!token) {
      throw new UnauthorizedException('Tracking token is required');
    }
    return this.shipmentsService.getPublicTracking(token);
  }
}

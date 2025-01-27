import { Controller, Post, Body, UseGuards, Get, Param, Put, Delete, Query, ClassSerializerInterceptor, UseInterceptors } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { IcpUser, UserRole } from '../auth/entities/icp.user.entity';
import { User } from '../auth/decorators/user.decorator';
import { Route } from './entities/route.entity';
import { ApiOperation, ApiResponse, ApiTags, ApiBody, ApiParam } from '@nestjs/swagger';
import { UpdateRouteDto } from './dto/update-route.dto';
import { RouteSimulation } from './dto/route-simulation.dto';
import { ShipmentGuard } from 'src/auth/guards/shipment.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ShipmentSyncGuard } from 'src/auth/guards/shipment.sync.guard';
import { UpdateLocationDto } from './dto/update-location.dto';
import { RouteTrackingService } from '../core/services/route-tracking.service';
import { RouteStop } from './entities/routeStop.entity';
import { Shipment } from 'src/shipments/entities/shipment.entity';
import { RouteDelay } from './entities/route-delay.entity';
import { RouteMetrics } from './entities/route-metrics.entity';
import { RouteWithActivationDto } from './dto/route-with-activation.dto';
import { RouteSegmentUpdate } from 'src/core/services/routing.service';
import { StopUpdate } from 'src/core/services/routing.service';

@ApiTags('routes')
@Controller('routes')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class RoutesController {
  constructor(
    private readonly routesService: RoutesService,
    private readonly routeTrackingService: RouteTrackingService
  ) {}

  @Post('simulate')
  @ApiOperation({ summary: 'Simulate a route without saving' })
  @ApiResponse({ status: 200, type: RouteSimulation, description: 'Route simulation results' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: CreateRouteDto })
  async simulateRoute(
    @User() user: IcpUser,
    @Body() createRouteDto: CreateRouteDto,
  ): Promise<RouteSimulation> {
    return this.routesService.simulateRoute(createRouteDto, user);
  }

  // @Get(':id')
  // @ApiOperation({ summary: 'Get route by id' })
  // @ApiResponse({ status: 200, type: Route })
  // async getRoute(
  //   @User() user: IcpUser,
  //   @Param('id') id: string
  // ): Promise<Route> {
  //   return this.routesService.findOneByUser(id, user);
  // }

  @Post()
  @ApiOperation({ summary: 'Create a new optimized route' })
  @ApiResponse({ status: 201, type: Route, description: 'Route created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiBody({ type: CreateRouteDto })
  async createRoute(
    @User() user: IcpUser,
    @Body() createRouteDto: CreateRouteDto,
  ): Promise<Route> {
    console.log(typeof createRouteDto.estimatedStartTime);
    return this.routesService.createOptimizedRoute(createRouteDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all routes for the authenticated user' })
  @ApiResponse({ status: 200, type: [RouteWithActivationDto], description: 'List of routes' })
  async getRoutes(@User() user: IcpUser): Promise<RouteWithActivationDto[]> {
    return this.routesService.findAllByUser(user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a route' })
  @ApiResponse({ status: 200, type: Route, description: 'Route updated successfully' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  @ApiParam({ name: 'id', type: String, description: 'Route ID' })
  @ApiBody({ type: UpdateRouteDto })
  async updateRoute(
    @User() user: IcpUser,
    @Param('id') id: string,
    @Body() updateRouteDto: UpdateRouteDto
  ): Promise<Route> {
    return this.routesService.update(id, updateRouteDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a route' })
  @ApiResponse({ status: 204, description: 'Route deleted successfully' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  @ApiParam({ name: 'id', type: String, description: 'Route ID' })
  async deleteRoute(
    @User() user: IcpUser,
    @Param('id') id: string
  ): Promise<void> {
    return this.routesService.remove(id, user);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a route' })
  @ApiResponse({ status: 200, type: Route, description: 'Route activated successfully' })
  @ApiResponse({ status: 404, description: 'Route not found' })
  @ApiParam({ name: 'id', type: String, description: 'Route ID' })
  async activateRoute(
    @Param('id') id: string,
    @User() user: IcpUser,
  ): Promise<Route> {
    return this.routesService.activateRoute(id, user.principal);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get currently active route' })
  @ApiResponse({ status: 200, type: Route, description: 'Active route' })
  @ApiResponse({ status: 404, description: 'No active route found' })
  @Roles(UserRole.CARRIER)
  async getActiveRoute(
    @User() user: IcpUser,
  ): Promise<Route | null> {
    return this.routesService.getActiveRoute(user.principal);
  }

  @Post('active/location')
  @ApiOperation({ summary: 'Update active route location' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  @ApiBody({ type: UpdateLocationDto })
  @Roles(UserRole.CARRIER)
  async updateLocation(
    @User() user: IcpUser,
    @Body() updateLocationDto: UpdateLocationDto
  ): Promise<{
    updatedRoute: Route;
    updatedStops: RouteStop[];
    delays: RouteDelay[];
    updatedShipments: Shipment[];
    updatedSegments: RouteSegmentUpdate[];
    updatedStopsWithNewETAs: StopUpdate[];
  }> {
    return this.routeTrackingService.updateCarrierLocation(
      user.principal,
      updateLocationDto,
    );
  }

  @Get('active/metrics')
  @Roles(UserRole.CARRIER)
  async getActiveRouteMetrics(
    @User() user: IcpUser,
  ): Promise<{
    route: Route;
    metrics: RouteMetrics;
    nextStop?: RouteStop;
    remainingStops: RouteStop[];
  }> {
    return this.routesService.getActiveRouteMetrics(user.principal);
  }

  @Get('active/progress')
  @Roles(UserRole.CARRIER)
  async getRouteProgress(
    @User() user: IcpUser,
  ): Promise<{
    completedStops: number;
    totalStops: number;
    completedDistance: number;
    remainingDistance: number;
    isDelayed: boolean;
    delayMinutes?: number;
    nextStopEta?: Date;
  }> {
    return this.routesService.getRouteProgress(user.principal);
  }

  // @Get(':id/delays')
  // @ApiOperation({ summary: 'Get route delay history' })
  // async getRouteDelays(
  //   @Param('id') routeId: string,
  //   @Query() query: {
  //     from?: Date;
  //     to?: Date;
  //     stopId?: string;
  //   },
  // ): Promise<RouteDelay[]> {
  //   return this.routesService.getDelayHistory(routeId, query);
  // }

  @Post('check-delivery')
  @ApiOperation({ summary: 'Check delivery status and update route data' })
  @UseGuards(ShipmentSyncGuard) // First sync ICP events
  async checkAndUpdateDelivery(
    @Body() data: { routeId: string; shipmentId: string },
  ): Promise<{
    updatedStop?: RouteStop;
    updatedShipment?: Shipment;
    wasUpdated: boolean;
  }> {
    const result = await this.routeTrackingService.checkAndUpdateDeliveryStop(
      data.routeId,
      data.shipmentId,
    );

    return {
      ...result,
      wasUpdated: !!result,
    };
  }
}

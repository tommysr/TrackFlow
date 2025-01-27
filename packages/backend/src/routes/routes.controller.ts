import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Delete,
} from '@nestjs/common';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { IcpUser, UserRole } from '../auth/entities/icp.user.entity';
import { User } from '../auth/decorators/user.decorator';
import { Route, RouteStatus } from './entities/route.entity';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { RouteSimulation } from './dto/route-simulation.dto';
import { ShipmentSyncGuard } from 'src/auth/guards/shipment.sync.guard';
import { UpdateLocationDto } from './dto/update-location.dto';
import { RouteTrackingService } from '../core/services/route-tracking.service';
import { RouteWithActivationDto } from './dto/route-with-activation.dto';
import { LocationUpdateResponseDto } from './dto/location-update-response.dto';
import { ActiveRouteMetricsDto } from './dto/active-route-metrics.dto';
import { RouteProgressDto } from './dto/route-progress.dto';
import { DeliveryUpdateResponseDto } from './dto/delivery-update-response.dto';
import { DeliveryUpdateDto } from './dto/delivery-update.dto';

@ApiTags('routes')
@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(
    private readonly routesService: RoutesService,
    private readonly routeTrackingService: RouteTrackingService,
  ) {}

  @Post('simulate')
  @ApiOperation({ summary: 'Simulate a route without saving' })
  @ApiResponse({
    status: 200,
    type: RouteSimulation,
    description: 'Route simulation results',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example:
            'Some shipment ids are not valid | Some shipments are not ready for processing | Some shipments are not owned by the carrier | Carrier not found | Pickup/Delivery time outside allowed window',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiBody({ type: CreateRouteDto })
  async simulateRoute(
    @User() user: IcpUser,
    @Body() createRouteDto: CreateRouteDto,
  ): Promise<RouteSimulation> {
    return this.routesService.simulateRoute(createRouteDto, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new optimized route' })
  @ApiResponse({
    status: 201,
    type: String,
    description: 'Route created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example:
            'Some shipment ids are not valid | Some shipments are not ready for processing | Some shipments are not owned by the carrier | Carrier not found | Pickup/Delivery time outside allowed window | Some shipments are already assigned to routes in this time window | Shipments are currently in active delivery',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiBody({ type: CreateRouteDto })
  async createRoute(
    @User() user: IcpUser,
    @Body() createRouteDto: CreateRouteDto,
  ): Promise<string> {
    return this.routesService.createOptimizedRoute(createRouteDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all routes for the authenticated user' })
  @ApiResponse({
    status: 200,
    type: [RouteWithActivationDto],
    description: 'List of routes',
  })
  async getRoutes(@User() user: IcpUser): Promise<RouteWithActivationDto[]> {
    return this.routesService.findAllByUser(user);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a route',
    description:
      'Deletes a route and all its associated data including stops, segments, metrics, distance matrix, and history records',
  })
  @ApiResponse({
    status: 204,
    description: 'Route and all associated data deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Route not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Route #[id] not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete an active route',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Cannot delete an active route' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiParam({ name: 'id', type: String, description: 'Route ID' })
  async deleteRoute(
    @User() user: IcpUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.routesService.remove(id, user);
  }

  @Post(':id/activate')
  @ApiOperation({
    summary: 'Activate a route',
    description:
      'Activates a pending route and recalculates ETAs based on current time',
  })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'string',
      enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
      example: 'ACTIVE',
    },
    description: 'Route activated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Route not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Route not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example:
            'Route must be in PENDING status to activate | Carrier already has an active route | Pickup/Delivery time would fall outside allowed window if activated now',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiParam({ name: 'id', type: String, description: 'Route ID' })
  async activateRoute(
    @Param('id') id: string,
    @User() user: IcpUser,
  ): Promise<RouteStatus> {
    return this.routesService.activateRoute(id, user.principal);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get currently active route' })
  @ApiResponse({ status: 200, type: Route, description: 'Active route' })
  @ApiResponse({ status: 404, description: 'No active route found' })
  async getActiveRoute(@User() user: IcpUser): Promise<Route | null> {
    return this.routesService.getActiveRoute(user.principal);
  }

  @Post('active/location')
  @ApiOperation({ summary: 'Update active route location' })
  @ApiResponse({
    status: 200,
    type: LocationUpdateResponseDto,
    description: 'Location updated successfully',
  })
  @ApiBody({ type: UpdateLocationDto })
  async updateLocation(
    @User() user: IcpUser,
    @Body() updateLocationDto: UpdateLocationDto,
  ): Promise<LocationUpdateResponseDto> {
    return this.routeTrackingService.updateCarrierLocation(
      user.principal,
      updateLocationDto,
    );
  }

  @Get('active/metrics')
  @ApiOperation({ summary: 'Get metrics for the currently active route' })
  @ApiResponse({
    status: 200,
    description: 'Returns route metrics, next stop, and remaining stops',
    type: ActiveRouteMetricsDto,
  })
  async getActiveRouteMetrics(
    @User() user: IcpUser,
  ): Promise<ActiveRouteMetricsDto> {
    return this.routesService.getActiveRouteMetrics(user.principal);
  }

  @Get('active/progress')
  @ApiOperation({ summary: 'Get progress information for the active route' })
  @ApiResponse({
    status: 200,
    description: 'Returns route progress statistics',
    type: RouteProgressDto,
  })
  async getRouteProgress(@User() user: IcpUser): Promise<RouteProgressDto> {
    return this.routesService.getRouteProgress(user.principal);
  }

  @Post('check-delivery')
  @ApiOperation({ summary: 'Check delivery status and update route data' })
  @ApiResponse({
    status: 200,
    description: 'Returns updated stop and shipment information',
    type: DeliveryUpdateResponseDto,
  })
  @UseGuards(ShipmentSyncGuard)
  async checkAndUpdateDelivery(
    @Body() data: DeliveryUpdateDto,
  ): Promise<DeliveryUpdateResponseDto> {
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

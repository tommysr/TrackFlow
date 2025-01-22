import { Controller, Post, Body, UseGuards, Get, Param, Put, Delete, Query } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { IcpUser, UserRole } from '../auth/entities/icp.user.entity';
import { User } from '../auth/decorators/user.decorator';
import { Route } from './entities/route.entity';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateRouteDto } from './dto/update-route.dto';
import { RouteSimulation } from './dto/route-simulation.dto';
import { ShipmentGuard } from 'src/auth/guards/shipment.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { ShipmentSyncGuard } from 'src/auth/guards/shipment.sync.guard';

@ApiTags('routes')
@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post('simulate')
  // @Roles(UserRole.CARRIER, UserRole.ADMIN)
  // @UseGuards(ShipmentSyncGuard)
  // @UseGuards(ShipmentGuard)
  @ApiOperation({ summary: 'Simulate route without saving' })
  @ApiResponse({ status: 200, type: RouteSimulation })
  async simulateRoute(
    @User() user: IcpUser,
    @Body() createRouteDto: CreateRouteDto,
  ): Promise<RouteSimulation> {
    return this.routesService.simulateRoute(createRouteDto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get route by id' })
  @ApiResponse({ status: 200, type: Route })
  async getRoute(
    @User() user: IcpUser,
    @Param('id') id: string
  ): Promise<Route> {
    return this.routesService.findOneByUser(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create optimized route' })
  @ApiResponse({ status: 201, type: Route })
  async createRoute(
    @User() user: IcpUser,
    @Body() createRouteDto: CreateRouteDto,
  ): Promise<Route> {
    return this.routesService.createOptimizedRoute(createRouteDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all routes' })
  @ApiResponse({ status: 200, type: [Route] })
  async getRoutes(@User() user: IcpUser): Promise<Route[]> {
    return this.routesService.findAllByUser(user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update route' })
  @ApiResponse({ status: 200, type: Route })
  async updateRoute(
    @User() user: IcpUser,
    @Param('id') id: string,
    @Body() updateRouteDto: UpdateRouteDto
  ): Promise<Route> {
    return this.routesService.update(id, updateRouteDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete route' })
  @ApiResponse({ status: 204 })
  async deleteRoute(
    @User() user: IcpUser,
    @Param('id') id: string
  ): Promise<void> {
    return this.routesService.remove(id, user);
  }
}

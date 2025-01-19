import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { IcpUser } from '../auth/entities/icp.user.entity';
import { User } from '../auth/decorators/user.decorator';
import { Route } from './entities/route.entity';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('routes')
@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post()
  @ApiOperation({ summary: 'Create optimized route' })
  @ApiResponse({ status: 201, type: Route })
  async createRoute(
    @User() user: IcpUser,
    @Body() createRouteDto: CreateRouteDto,
  ): Promise<Route> {
    return this.routesService.createOptimizedRoute(createRouteDto, user);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview route without saving' })
  @ApiResponse({ status: 200, type: Route })
  async previewRoute(
    @User() user: IcpUser,
    @Body() createRouteDto: CreateRouteDto,
  ): Promise<Route> {
    return this.routesService.previewRoute(createRouteDto, user);
  }
}

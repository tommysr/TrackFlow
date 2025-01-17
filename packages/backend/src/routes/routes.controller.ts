import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { IcpUser } from '../auth/entities/icp.user.entity';
import { User } from '../auth/decorators/user.decorator';
import { Route } from '../aggregation/entities/route.entity';

@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post()
  async createRoute(
    @User() user: IcpUser,
    @Body() createRouteDto: CreateRouteDto,
  ): Promise<Route> {
    return this.routesService.createOptimizedRoute(createRouteDto, user);
  }

  @Post('preview')
  async previewRoute(
    @User() user: IcpUser,
    @Body() createRouteDto: CreateRouteDto,
  ): Promise<Route> {
    return this.routesService.previewRoute(createRouteDto, user);
  }
}

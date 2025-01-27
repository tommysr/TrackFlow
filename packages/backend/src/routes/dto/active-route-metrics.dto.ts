import { Route } from '../entities/route.entity';
import { RouteMetrics } from '../entities/route-metrics.entity';
import { RouteStop } from '../entities/routeStop.entity';
import { ApiProperty } from '@nestjs/swagger';

export class ActiveRouteMetricsDto {
  @ApiProperty({ type: () => Route })
  route: Route;

  @ApiProperty({ type: () => RouteMetrics })
  metrics: RouteMetrics;

  @ApiProperty({ type: () => RouteStop, required: false })
  nextStop?: RouteStop;

  @ApiProperty({ type: [RouteStop] })
  remainingStops: RouteStop[];
}

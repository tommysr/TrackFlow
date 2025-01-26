import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RouteDelay } from 'src/routes/entities/route-delay.entity';
import { Repository } from 'typeorm';
import {
  RouteSegmentUpdate,
  RouteUpdateResult,
  RoutingService,
  StopUpdate,
} from './routing.service';
import { Route } from 'src/routes/entities/route.entity';
import { LocationDto } from 'src/common/dto/location.dto';
import { RouteStop } from 'src/routes/entities/routeStop.entity';
import { RouteSegment } from 'src/routes/entities/routeSegment.entity';

@Injectable()
export class ETAService {
  constructor(
    @InjectRepository(RouteDelay)
    private readonly routeDelayRepo: Repository<RouteDelay>,
    private readonly routingService: RoutingService,
  ) {}

  async updateDelays(
    updatedStops: StopUpdate[],
    route: Route,
    currentLocation: LocationDto,
  ): Promise<RouteDelay[]> {
    const delays: RouteDelay[] = [];

    await Promise.all(
      updatedStops.map(async (update) => {
        const stop = route.stops.find((s) => s.id === update.id);
        const originalEta = stop.estimatedArrival;
        const newEta = update.estimatedArrival;

        if (newEta > originalEta) {
          const delay = this.routeDelayRepo.create({
            stop,
            recordedAt: new Date(),
            delayMinutes: Math.round(
              (newEta.getTime() - originalEta.getTime()) / 60000,
            ),
            location: LocationDto.toGeoJSON(
              currentLocation.lng,
              currentLocation.lat,
            ),
            metadata: {
              originalEta,
              updatedEta: newEta,
            },
          });
          delays.push(await this.routeDelayRepo.save(delay));
        }

        return Object.assign(stop, update);
      }),
    );

    return delays;
  }

  async updateETAs(
    route: Route,
    currentLocation: LocationDto,
  ): Promise<RouteUpdateResult> {
    const routeUpdate = await this.routingService.calculateRouteUpdate(
      currentLocation,
      route.stops,
    );

    return routeUpdate;
  }
}

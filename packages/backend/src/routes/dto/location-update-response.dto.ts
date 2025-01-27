import { ApiProperty } from '@nestjs/swagger';
import { Route } from '../entities/route.entity';
import { RouteStop } from '../entities/routeStop.entity';
import { RouteDelay } from '../entities/route-delay.entity';
import { Shipment } from 'src/shipments/entities/shipment.entity';
import { RouteSegmentUpdateDto, StopUpdateDto } from './route-segment-update.dto';

export class LocationUpdateResponseDto {
  @ApiProperty({ type: () => Route })
  updatedRoute: Route;

  @ApiProperty({ type: [RouteStop] })
  updatedStops: RouteStop[];

  @ApiProperty({ type: [RouteDelay] })
  delays: RouteDelay[];

  @ApiProperty({ type: [Shipment] })
  updatedShipments: Shipment[];

  @ApiProperty({ type: [RouteSegmentUpdateDto] })
  updatedSegments: RouteSegmentUpdateDto[];

  @ApiProperty({ type: [StopUpdateDto] })
  updatedStopsWithNewETAs: StopUpdateDto[];
} 
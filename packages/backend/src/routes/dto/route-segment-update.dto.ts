import { ApiProperty } from '@nestjs/swagger';
import { GeoLineString } from '../types/location.types';

export class RouteSegmentUpdateDto {
  @ApiProperty({
    description: 'ID of the starting stop',
    example: 'stop-123'
  })
  fromStopId: string;

  @ApiProperty({
    description: 'ID of the destination stop',
    example: 'stop-456'
  })
  toStopId: string;

  @ApiProperty({
    description: 'GeoJSON LineString representing the path',
    example: {
      type: 'LineString',
      coordinates: [[21.017532, 52.237049], [21.018276, 52.237049]]
    }
  })
  path: GeoLineString;

  @ApiProperty({
    description: 'Distance in meters',
    example: 1500.5
  })
  distance: number;

  @ApiProperty({
    description: 'Duration in seconds',
    example: 300
  })
  duration: number;
}

export class StopUpdateDto {
  @ApiProperty({
    description: 'Stop ID',
    example: 'stop-123'
  })
  id: string;

  @ApiProperty({
    description: 'Estimated arrival time',
    example: '2024-01-27T12:00:00Z'
  })
  estimatedArrival: Date;
} 
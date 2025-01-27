import { ApiProperty } from '@nestjs/swagger';

export class RouteProgressDto {
  @ApiProperty({ 
    type: 'number',
    description: 'Number of stops that have been completed',
    example: 3,
    minimum: 0
  })
  completedStops: number;

  @ApiProperty({ 
    type: 'number',
    description: 'Total number of stops in the route',
    example: 8,
    minimum: 0
  })
  totalStops: number;

  @ApiProperty({ 
    type: 'number',
    description: 'Distance covered so far in meters',
    example: 15200,
    minimum: 0
  })
  completedDistance: number;

  @ApiProperty({ 
    type: 'number',
    description: 'Remaining distance to cover in meters',
    example: 8400,
    minimum: 0
  })
  remainingDistance: number;

  @ApiProperty({ 
    type: 'boolean',
    description: 'Indicates if the route is currently delayed',
    example: false
  })
  isDelayed: boolean;

  @ApiProperty({ 
    type: 'number',
    description: 'Number of minutes the route is delayed (if delayed)',
    example: 15,
    minimum: 0,
    required: false
  })
  delayMinutes?: number;

  @ApiProperty({ 
    type: 'string',
    format: 'date-time',
    description: 'Estimated time of arrival at the next stop',
    example: '2024-01-27T14:30:00Z',
    required: false
  })
  nextStopEta?: Date;
}

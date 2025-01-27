import { Type } from 'class-transformer';
import { IsArray, IsNumber, ValidateNested, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LocationDto } from 'src/common/dto/location.dto';

export enum StopType {
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY',
  START = 'START',
  END = 'END'
}

export class ShipmentLocation {
  @ApiProperty({ 
    type: LocationDto,
    description: 'Location where the shipment should be picked up'
  })
  @ValidateNested()
  @Type(() => LocationDto)
  pickupAddress: LocationDto;

  @ApiProperty({ 
    type: LocationDto,
    description: 'Location where the shipment should be delivered'
  })
  @ValidateNested()
  @Type(() => LocationDto)
  deliveryAddress: LocationDto;
}

export class RouteStop {
  @ApiProperty({
    description: 'Order of the stop in the route sequence',
    example: 2,
    minimum: 0
  })
  @IsNumber()
  sequenceIndex: number;

  @ApiProperty({ 
    enum: StopType,
    description: 'Type of stop (pickup, delivery, start, or end)',
    example: StopType.PICKUP,
    enumName: 'StopType'
  })
  @IsEnum(StopType)
  stopType: StopType;

  @ApiProperty({ 
    type: LocationDto,
    description: 'Location details of the stop'
  })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({
    description: 'Estimated time of arrival at this stop',
    example: '2024-01-27T15:30:00Z',
    format: 'date-time'
  })
  @Type(() => Date)
  estimatedArrival: Date;
}

export class RouteSimulation {
  @ApiProperty({ 
    type: [ShipmentLocation],
    description: 'List of shipment locations including pickup and delivery points'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentLocation)
  shipments: ShipmentLocation[];

  @ApiProperty({ 
    type: [RouteStop],
    description: 'Ordered list of stops in the route'
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteStop)
  stops: RouteStop[];

  @ApiProperty({
    description: 'Total distance of the route in meters',
    example: 25000,
    minimum: 0
  })
  @IsNumber()
  totalDistance: number;

  @ApiProperty({
    description: 'Estimated fuel cost for the route',
    example: 45.50,
    minimum: 0
  })
  @IsNumber()
  totalFuelCost: number;

  @ApiProperty({
    description: 'Estimated time to complete the route in seconds',
    example: 3600,
    minimum: 0
  })
  @IsNumber()
  estimatedTime: number;

  @ApiProperty({
    description: 'GeoJSON LineString representing the complete route path',
    example: {
      type: 'LineString',
      coordinates: [
        [21.017532, 52.237049],
        [21.018276, 52.237049],
        [21.019001, 52.236881]
      ]
    }
  })
  fullPath: {
    type: 'LineString';
    coordinates: [number, number][];
  };

  @ApiProperty({ 
    required: false,
    description: 'Matrix of travel durations and distances between all stops',
    example: {
      durations: [[0, 300], [300, 0]],
      distances: [[0, 5000], [5000, 0]]
    }
  })
  distanceMatrix?: {
    durations: number[][];
    distances: number[][];
  };
} 
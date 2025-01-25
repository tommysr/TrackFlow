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
  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  pickupAddress: LocationDto;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  deliveryAddress: LocationDto;
}

export class RouteStop {
  @ApiProperty()
  @IsNumber()
  sequenceIndex: number;

  @ApiProperty({ enum: StopType })
  @IsEnum(StopType)
  stopType: StopType;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty()
  @Type(() => Date)
  estimatedArrival: Date;
}

export class RouteSimulation {
  @ApiProperty({ type: [ShipmentLocation] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentLocation)
  shipments: ShipmentLocation[];

  @ApiProperty({ type: [RouteStop] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteStop)
  stops: RouteStop[];

  @ApiProperty()
  @IsNumber()
  totalDistance: number;

  @ApiProperty()
  @IsNumber()
  totalFuelCost: number;

  @ApiProperty()
  @IsNumber()
  estimatedTime: number;

  @ApiProperty()
  fullPath: {
    type: 'LineString';
    coordinates: [number, number][];
  };

  @ApiProperty({ required: false })
  distanceMatrix?: {
    durations: number[][];
    distances: number[][];
  };
} 
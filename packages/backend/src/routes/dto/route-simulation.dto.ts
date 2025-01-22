import { Type } from 'class-transformer';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class GeoPoint {
  @ApiProperty()
  @IsNumber()
  latitude: number;

  @ApiProperty()
  @IsNumber()
  longitude: number;
}

class ShipmentLocation {
  @ApiProperty({ type: GeoPoint })
  @ValidateNested()
  @Type(() => GeoPoint)
  pickupAddress: GeoPoint;

  @ApiProperty({ type: GeoPoint })
  @ValidateNested()
  @Type(() => GeoPoint)
  deliveryAddress: GeoPoint;
}

class RouteStop {
  @ApiProperty()
  @IsNumber()
  sequenceIndex: number;

  @ApiProperty({ enum: ['PICKUP', 'DELIVERY'] })
  stopType: 'PICKUP' | 'DELIVERY';

  @ApiProperty()
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  @ApiProperty()
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
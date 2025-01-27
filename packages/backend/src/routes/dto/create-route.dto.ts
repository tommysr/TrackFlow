import { IsArray, ValidateNested, IsEnum, IsDateString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationDto } from 'src/common/dto/location.dto';
import { ApiProperty } from '@nestjs/swagger';

export enum RouteOperationType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
  BOTH = 'both'
}

export class ShipmentOperationDto {
  @ApiProperty({
    description: 'Unique identifier of the shipment',
    example: 'ship_123abc'
  })
  @IsString()
  id: string;

  @ApiProperty({ 
    enum: RouteOperationType,
    description: 'Type of operation to perform with this shipment',
    example: RouteOperationType.PICKUP,
    enumName: 'RouteOperationType'
  })
  @IsEnum(RouteOperationType)
  type: RouteOperationType;
}

export class CreateRouteDto {
  @ApiProperty({ 
    type: [ShipmentOperationDto],
    description: 'List of shipments and their operations (pickup/delivery) to include in the route',
    example: [{
      id: 'ship_123abc',
      type: RouteOperationType.PICKUP
    }]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentOperationDto)
  shipments: ShipmentOperationDto[];

  @ApiProperty({
    type: LocationDto,
    description: 'Starting location for the route'
  })
  @ValidateNested()
  @Type(() => LocationDto)
  startLocation: LocationDto;

  @ApiProperty({
    type: LocationDto,
    description: 'Optional ending location for the route. If not provided, the last operation location will be used',
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  endLocation?: LocationDto;

  @ApiProperty({
    description: 'Planned start time for the route in ISO 8601 format',
    example: '2024-01-27T10:00:00Z',
    format: 'date-time'
  })
  @IsDateString()
  estimatedStartTime: Date;
} 

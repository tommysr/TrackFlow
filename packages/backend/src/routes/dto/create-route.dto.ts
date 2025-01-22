import { IsArray, ValidateNested, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { LocationDto } from 'src/shipments/dto/create-shipment.dto';
import { ApiProperty } from '@nestjs/swagger';

export enum RouteOperationType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
  BOTH = 'both'
}

class ShipmentOperation {
  @ApiProperty()
  @IsNumber()
  id: number;

  @ApiProperty({ enum: RouteOperationType })
  @IsEnum(RouteOperationType)
  type: RouteOperationType;
}

export class CreateRouteDto {
  @ApiProperty({ type: [ShipmentOperation] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentOperation)
  shipments: ShipmentOperation[];

  @ValidateNested()
  @Type(() => LocationDto)
  carrierLocation: LocationDto;

  @ApiProperty()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  estimatedStartTime: Date;
} 
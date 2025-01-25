import { IsArray, ValidateNested, IsEnum, IsNumber, IsDateString, IsOptional, IsBoolean, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { LocationDto } from 'src/common/dto/location.dto';
import { ApiProperty } from '@nestjs/swagger';

export enum RouteOperationType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
  BOTH = 'both'
}


export class ShipmentOperationDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty({ enum: RouteOperationType })
  @IsEnum(RouteOperationType)
  type: RouteOperationType;
}

export class CreateRouteDto {
  @ApiProperty({ type: [ShipmentOperationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShipmentOperationDto)
  shipments: ShipmentOperationDto[];

  @ValidateNested()
  @Type(() => LocationDto)
  startLocation: LocationDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  endLocation?: LocationDto;

  @ApiProperty()
  @IsDateString()
  @Transform(({ value }) => new Date(value))
  estimatedStartTime: Date;
} 
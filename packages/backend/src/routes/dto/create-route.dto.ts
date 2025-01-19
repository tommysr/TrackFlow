import { IsArray, ArrayNotEmpty, ValidateNested, IsEnum, IsNumber, IsDate, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationDto } from 'src/shipments/dto/create-shipment.dto';

export enum RouteOperationType {
  PICKUP = 'pickup', // not used
  DELIVERY = 'delivery', // not used
  BOTH = 'both'
}

export class ShipmentRouteOperation {
  @IsNumber()
  id: number;

  @IsEnum(RouteOperationType)
  type: RouteOperationType;
}

export class CreateRouteDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ShipmentRouteOperation)
  shipments: ShipmentRouteOperation[];

  @ValidateNested()
  @Type(() => LocationDto)
  carrierLocation: LocationDto;

  @IsDate()
  @Type(() => Date)
  estimatedStartTime: Date;
} 
import { IsEnum } from 'class-validator';
import { ShipmentStatus } from '../entities/shipment.entity';

export class UpdateStatusDto {
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus;
}

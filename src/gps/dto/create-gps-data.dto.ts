import { IsNotEmpty, IsNumber, IsUUID, IsISO8601 } from 'class-validator';

export class CreateGPSDataDto {
  @IsUUID()
  carrierId: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsISO8601()
  timestamp: string;
}

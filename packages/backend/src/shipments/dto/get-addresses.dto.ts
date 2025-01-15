
import { IsNotEmpty, IsNumber } from 'class-validator';

export class GetAddressesDto {
  @IsNotEmpty()
  @IsNumber() 
  shipmentId: number;
}

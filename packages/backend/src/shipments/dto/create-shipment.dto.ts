import {
  IsString,
  IsNotEmpty,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { AddressDto, AddressLocationDto } from './address-location.dto';

export class SetAddressDto {
  @ValidateNested()
  @Type(() => AddressLocationDto)
  pickupAddress: AddressLocationDto;

  @ValidateNested()
  @Type(() => AddressLocationDto)
  deliveryAddress: AddressLocationDto;

  @IsString()
  @IsNotEmpty()
  shipmentId: string;
}

export class GeocodeAddressDto {
  @ValidateNested()
  @Type(() => AddressDto)
  pickupAddress: AddressDto;

  @ValidateNested()
  @Type(() => AddressDto)
  deliveryAddress: AddressDto;
}

import { IsString, IsNotEmpty, ValidateNested, IsNumber, Matches, IsISBN, IsPostalCode, isAlphanumeric } from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9\s,.-]+$/)
  street: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z\s.-]+$/)
  city: string;

  @IsString()
  @IsNotEmpty()
  @IsPostalCode('PL')
  zip: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^PL$/)
  country: string;
}

export class AddressLocationDto extends AddressDto {
  @IsNumber()
  @IsNotEmpty()
  lat: number;

  @IsNumber()
  @IsNotEmpty()
  lng: number;
}

export class SetAddressDto {
  @ValidateNested()
  @Type(() => AddressLocationDto)
  pickupAddress: AddressLocationDto;

  @ValidateNested()
  @Type(() => AddressLocationDto)
  deliveryAddress: AddressLocationDto;

  // TODO: take bigint from blockchain
  @IsNumber()
  @IsNotEmpty()
  shipmentId: number;
} 

export class GeocodeAddressDto {
  @ValidateNested()
  @Type(() => AddressDto)
  pickupAddress: AddressDto;

  @ValidateNested()
  @Type(() => AddressDto)
  deliveryAddress: AddressDto;
}

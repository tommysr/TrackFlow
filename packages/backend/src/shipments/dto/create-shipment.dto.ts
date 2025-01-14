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
  @Matches(/^[a-zA-Z\s.-]+$/)
  state: string;

  @IsString()
  @IsNotEmpty()
  @IsPostalCode('PL')
  zip: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z\s.-]+$/)
  country: string;
}

export class CreateShipmentDto {
  @ValidateNested()
  @Type(() => AddressDto)
  pickupAddress: AddressDto;

  @ValidateNested()
  @Type(() => AddressDto)
  deliveryAddress: AddressDto;

  // TODO: take bigint from blockchain
  @IsNumber()
  @IsNotEmpty()
  shipmentId: number;
} 
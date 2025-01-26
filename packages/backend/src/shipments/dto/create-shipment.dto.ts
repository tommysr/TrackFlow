import {
  IsString,
  IsNotEmpty,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { AddressDto, AddressLocationDto } from './address-location.dto';

export class SetAddressDto {
  @ApiProperty({
    description: 'Pickup location with address details',
    type: AddressLocationDto
  })
  @ValidateNested()
  @Type(() => AddressLocationDto)
  pickupAddress: AddressLocationDto;

  @ApiProperty({
    description: 'Delivery location with address details',
    type: AddressLocationDto
  })
  @ValidateNested()
  @Type(() => AddressLocationDto)
  deliveryAddress: AddressLocationDto;

  @ApiProperty({
    description: 'Unique identifier of the shipment',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  @IsNotEmpty()
  shipmentId: string;
}

export class GeocodeAddressDto {
  @ApiProperty({
    description: 'Pickup address details',
    type: AddressDto
  })
  @ValidateNested()
  @Type(() => AddressDto)
  pickupAddress: AddressDto;

  @ApiProperty({
    description: 'Delivery address details',
    type: AddressDto
  })
  @ValidateNested()
  @Type(() => AddressDto)
  deliveryAddress: AddressDto;
}

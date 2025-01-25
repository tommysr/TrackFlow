// packages/backend/src/shipments/dto/address-location.dto.ts
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, ValidateNested, Matches, IsPostalCode } from 'class-validator';
import { LocationDto } from 'src/common/dto/location.dto';

// Base address validation
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

// Combined address + location for both requests and responses
export class AddressLocationDto extends LocationDto {
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}

// For backward compatibility, can be removed later
export class AddressLocationResponseDto extends AddressLocationDto {}
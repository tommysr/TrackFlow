// packages/backend/src/shipments/dto/address-location.dto.ts
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, ValidateNested, Matches, IsPostalCode } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LocationDto } from 'src/common/dto/location.dto';

// Base address validation
export class AddressDto {
  @ApiProperty({
    description: 'Street address including building number',
    example: 'ul. Krakowska 15',
    pattern: '^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\\s,.-]+$'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\s,.-]+$/)  
  street: string;

  @ApiProperty({
    description: 'City name',
    example: 'Warszawa',
    pattern: '^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\\s.-]+$'
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s.-]+$/)
  city: string;

  @ApiProperty({
    description: 'Polish postal code',
    example: '00-001',
    pattern: '^\\d{2}-\\d{3}$'
  })
  @IsString()
  @IsNotEmpty()
  @IsPostalCode('PL')
  zip: string;

  @ApiProperty({
    description: 'Country code (only PL supported)',
    example: 'PL',
    enum: ['PL']
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^PL$/)
  country: string;
}

// Combined address + location for both requests and responses
export class AddressLocationDto extends LocationDto {
  @ApiProperty({
    description: 'Address details',
    type: AddressDto
  })
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}

// For backward compatibility, can be removed later
export class AddressLocationResponseDto extends AddressLocationDto {}
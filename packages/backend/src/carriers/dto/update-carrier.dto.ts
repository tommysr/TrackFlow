import { IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCarrierDto {
  @ApiProperty({ 
    required: false,
    description: 'Average fuel consumption in kilometers per liter',
    minimum: 0,
    example: 8.5,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelEfficiency?: number;

  @ApiProperty({ 
    required: false,
    description: 'Current fuel cost per liter in PLN',
    minimum: 0,
    example: 6.50,
    type: Number
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelCostPerLiter?: number;
} 
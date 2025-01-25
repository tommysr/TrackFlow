import { IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCarrierDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelEfficiency?: number; // km per liter

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelCostPerLiter?: number; // currency per liter
} 
import { IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateCarrierDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelEfficiency?: number; // km per liter

  @IsOptional()
  @IsNumber()
  @Min(0)
  fuelCostPerLiter?: number; // currency per liter
} 
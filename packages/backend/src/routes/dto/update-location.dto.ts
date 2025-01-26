import { IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationDto } from 'src/common/dto/location.dto';

export class UpdateLocationDto extends LocationDto {
  @IsDateString()
  timestamp: Date;
} 
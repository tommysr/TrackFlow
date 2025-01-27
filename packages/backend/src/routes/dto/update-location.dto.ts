import { IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationDto } from 'src/common/dto/location.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLocationDto extends LocationDto {
  @ApiProperty({
    description: 'Timestamp when the location was recorded',
    example: '2024-01-27T12:34:56Z',
    format: 'date-time'
  })
  @IsDateString()
  timestamp: Date;
} 
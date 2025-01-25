import { IsDate, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TimeWindowDto {
  @ApiProperty()
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  start: Date;

  @ApiProperty()
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  end: Date;
} 
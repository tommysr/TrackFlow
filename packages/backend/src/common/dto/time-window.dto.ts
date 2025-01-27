import { IsDate, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class TimeWindowDto {
  @ApiProperty({
    description: 'Start time',
    type: Date,
  })
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  start: Date;

  @ApiProperty({
    description: 'End time',
    type: Date,
  })
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  end: Date;
}

import { IsDate, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TimeWindowDto } from 'src/common/dto/time-window.dto';


export class ShipmentWindowsDto {
  @ApiProperty({ type: TimeWindowDto })
  @ValidateNested()
  @Type(() => TimeWindowDto)
  pickup: TimeWindowDto;

  @ApiProperty({ type: TimeWindowDto })
  @ValidateNested()
  @Type(() => TimeWindowDto)
  delivery: TimeWindowDto;
}
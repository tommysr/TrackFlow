import { IsDate, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class SetStopDateDto {
  @IsDate()
  @IsNotEmpty()
  @Type(() => Date)
  stopDate: Date;
}

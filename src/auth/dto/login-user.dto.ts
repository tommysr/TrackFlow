import { IsString } from 'class-validator';
import {MinLength} from 'class-validator'

export class LoginUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;
}
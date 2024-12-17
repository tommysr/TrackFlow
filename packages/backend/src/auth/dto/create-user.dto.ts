import { IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '../entities/icp.user.entity';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
} 
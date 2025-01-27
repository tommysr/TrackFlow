import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ 
    description: 'User\'s full name to be updated',
    example: 'John Doe',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ 
    description: 'User\'s contact email address for notifications and communications',
    example: 'john.doe@example.com',
    required: false,
    format: 'email'
  })
  @IsEmail()
  @IsOptional()
  contact?: string;
} 


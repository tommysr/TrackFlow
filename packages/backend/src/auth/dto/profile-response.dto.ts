import { IsString } from 'class-validator';
import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { UserRole } from '../entities/icp.user.entity';

export class ProfileResponseDto {
  @ApiProperty({
    description: "User's full name",
    example: 'John Doe',
    nullable: true,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description:
      "User's contact email address for notifications and communications",
    example: 'john.doe@example.com',
    nullable: true,
  })
  @IsEmail()
  contact: string;

  @ApiProperty({
    description: 'List of user roles defining their permissions in the system',
    example: ['USER', 'SHIPPER'],
    enum: UserRole,
  })
  @IsArray()
  roles: UserRole[];
}

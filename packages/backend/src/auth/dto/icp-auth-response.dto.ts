import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class IcpAuthResponseDto {
  @ApiProperty({ 
    description: 'JWT access token for authenticated requests',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    format: 'jwt'
  })
  @IsString()
  accessToken: string;
}

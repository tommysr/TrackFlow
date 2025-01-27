import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ChallengeResponseDto {
  @ApiProperty({ 
    description: 'Challenge string that needs to be signed by the ICP identity',
    example: 'f7d8a9b3c2e1'
  })
  @IsString()
  challenge: string;

  @ApiProperty({ 
    description: 'Unique session identifier for this authentication attempt',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid'
  })
  @IsString()
  sessionId: string;
}

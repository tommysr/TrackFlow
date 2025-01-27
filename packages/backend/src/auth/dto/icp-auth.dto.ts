import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";


export class IcpPayload {
  @ApiProperty({ description: 'Principal' })
  @IsString()
  principal: string;

  @ApiProperty({ description: 'User Key' })
  @IsString()
  userKey: string;
}


export class IcpAuthDto {
  @ApiProperty({
    description: 'Session ID from the challenge request',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: 'Challenge string from the challenge request',
    example: 'abc123xyz'
  })
  @IsString()
  @IsNotEmpty()
  challenge: string;
}
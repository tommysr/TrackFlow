import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { RouteStatus } from '../entities/route.entity';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRouteDto {
  @ApiProperty({
    enum: RouteStatus,
    description: 'New status for the route',
    example: RouteStatus.ACTIVE,
    required: false,
    enumName: 'RouteStatus'
  })
  @IsEnum(RouteStatus)
  @IsOptional()
  status?: RouteStatus;
} 
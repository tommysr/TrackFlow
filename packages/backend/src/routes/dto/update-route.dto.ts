import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { RouteStatus } from '../entities/route.entity';

export class UpdateRouteDto {
  @IsEnum(RouteStatus)
  @IsOptional()
  status?: RouteStatus;
} 
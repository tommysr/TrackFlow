import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { GPSService } from './gps.service';
import { CreateGPSDataDto } from './dto/create-gps-data.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('gps')
@Controller('gps')
export class GPSController {
  constructor(private readonly gpsService: GPSService) {}

}

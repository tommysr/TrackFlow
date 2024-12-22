import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { GPSService } from './gps.service';
import { CreateGPSDataDto } from './dto/create-gps-data.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('gps')
@Controller('gps')
export class GPSController {
  constructor(private readonly gpsService: GPSService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('update')
  @ApiOperation({ summary: 'Update GPS data' })
  @ApiResponse({ status: 201, description: 'GPS data updated successfully.' })
  async updateGPS(@Body() createGPSDataDto: CreateGPSDataDto) {
    return this.gpsService.handleGPSUpdate(createGPSDataDto);
  }
}

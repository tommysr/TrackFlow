import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
  UnauthorizedException,
  Put,
  Body,
  Req,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBody, 
  ApiBearerAuth,
  ApiHeader 
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { ChallengeService } from './services/challenge.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChallengeResponseDto } from './dto/challenge-response.dto';
import { IcpAuthResponseDto } from './dto/icp-auth-response.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { IcpAuthDto, IcpPayload } from './dto/icp-auth.dto';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly challengeService: ChallengeService,
  ) {}

  @Get('challenge')
  @ApiOperation({ 
    summary: 'Get a challenge for ICP auth',
    description: 'Generates a new challenge string and session ID for Internet Computer (ICP) authentication flow'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a new challenge and session ID',
    type: ChallengeResponseDto,
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error while generating challenge' 
  })
  getChallenge(): ChallengeResponseDto {
    return this.challengeService.generateChallenge();
  }

  @Post('icp')
  @UseGuards(AuthGuard('icp'))
  @ApiOperation({ 
    summary: 'ICP authentication',
    description: 'Authenticates a user using Internet Computer (ICP) identity and returns a JWT token'
  })
  @ApiResponse({
    status: 200,
    type: IcpAuthResponseDto,
    description: 'Authentication successful',
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid request body' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or expired challenge' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error during authentication' 
  })
  @ApiBody({ 
    type: IcpAuthDto,
    description: 'ICP authentication credentials including session ID and challenge'
  })
  @HttpCode(HttpStatus.OK)
  async icpAuth(
    @Request()
    req: {
      user: IcpPayload;
      body: IcpAuthDto;
    },
  ): Promise<IcpAuthResponseDto> {
    const { sessionId, challenge } = req.body;

    if (!this.challengeService.validateChallenge(sessionId, challenge)) {
      throw new UnauthorizedException('Invalid or expired challenge');
    }

    return this.authService.authorizeIcpSession(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  @ApiOperation({ 
    summary: 'Update user profile',
    description: 'Updates the authenticated user\'s profile information including name and contact details'
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: ProfileResponseDto,
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Invalid request body' 
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error while updating profile' 
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'JWT Bearer token',
    required: true,
  })
  @ApiBody({ 
    type: UpdateProfileDto,
    description: 'Profile information to update'
  })
  async updateProfile(
    @Req() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.authService.updateProfile(req.user.principal, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ 
    summary: 'Get user profile',
    description: 'Retrieves the authenticated user\'s profile information including roles and contact details'
  })
  @ApiResponse({
    status: 200,
    description: 'Returns user profile information',
    type: ProfileResponseDto,
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized - Invalid or missing JWT token' 
  })
  @ApiResponse({ 
    status: 500, 
    description: 'Internal server error while fetching profile' 
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'JWT Bearer token',
    required: true,
  })
  async getProfile(@Req() req: any): Promise<ProfileResponseDto> {
    return this.authService.getProfile(req.user.principal);
  }
}

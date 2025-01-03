import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { IcpPayload } from './strategies/icp-payload.interface';
import { ChallengeService } from './services/challenge.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly challengeService: ChallengeService,
  ) {}

  @Get('challenge')
  @ApiOperation({ summary: 'Get a challenge for ICP auth' })
  @ApiResponse({
    status: 200,
    description: 'Returns a new challenge and session ID',
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        challenge: { type: 'string' },
      },
    },
  })
  getChallenge() {
    return this.challengeService.generateChallenge();
  }

  @Post('icp')
  @UseGuards(AuthGuard('icp'))
  @ApiOperation({ summary: 'ICP authentication' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @HttpCode(HttpStatus.OK)
  async icpAuth(
    @Request()
    req: {
      user: IcpPayload;
      body: { sessionId: string; challenge: string };
    },
  ) {
    const { sessionId, challenge } = req.body;

    if (!this.challengeService.validateChallenge(sessionId, challenge)) {
      throw new UnauthorizedException('Invalid or expired challenge');
    }

    return this.authService.authorizeIcpSession(req.user);
  }
}

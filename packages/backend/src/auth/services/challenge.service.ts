import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Challenge } from '../types/challenge.types';
import { ChallengeResponseDto } from '../dto/challenge-response.dto';

@Injectable()
export class ChallengeService {
  private readonly activeChallenges = new Map<string, Challenge>();
  private readonly CHALLENGE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  generateChallenge(): ChallengeResponseDto {
    const challenge = randomBytes(32);
    const sessionId = randomBytes(16).toString('hex');
    
    this.activeChallenges.set(sessionId, {
      challenge,
      expires: Date.now() + this.CHALLENGE_EXPIRY
    });

    // Clean up expired challenges
    this.cleanupExpiredChallenges();

    return {
      sessionId,
      challenge: challenge.toString('base64')
    };
  }

  validateChallenge(sessionId: string, challenge: string): boolean {
    const storedChallenge = this.activeChallenges.get(sessionId);
    
    if (!storedChallenge) {
      return false;
    }

    if (Date.now() > storedChallenge.expires) {
      this.activeChallenges.delete(sessionId);
      return false;
    }

    const isValid = Buffer.from(challenge, 'base64').equals(Buffer.from(storedChallenge.challenge));
    
    // Remove the challenge after use
    if (isValid) {
      this.activeChallenges.delete(sessionId);
    }

    return isValid;
  }

  private cleanupExpiredChallenges(): void {
    const now = Date.now();
    for (const [sessionId, challenge] of this.activeChallenges.entries()) {
      if (now > challenge.expires) {
        this.activeChallenges.delete(sessionId);
      }
    }
  }

  getChallenge(sessionId: string): Challenge | undefined {
    const challenge = this.activeChallenges.get(sessionId);
    if (!challenge || Date.now() > challenge.expires) {
      this.activeChallenges.delete(sessionId);
      return undefined;
    }
    return challenge;
  }
} 
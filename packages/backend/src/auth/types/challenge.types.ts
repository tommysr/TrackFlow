export interface Challenge {
  challenge: ArrayBuffer;
  expires: number;
}

export interface ChallengeResponse {
  sessionId: string;
  challenge: string; // Base64 encoded challenge
} 
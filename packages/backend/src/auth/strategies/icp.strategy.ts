import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Principal } from '@dfinity/principal';
import {
  DelegationChain,
  Delegation,
  SignedDelegation,
} from '@dfinity/identity';
import { isIdentitySignatureValid } from '@slide-computer/signer/packages/signer-signatures/lib/cjs';
import { ChallengeService } from '../services/challenge.service';

interface IcpPayload {
  principal: string;
}

interface ProcessedDelegation {
  delegation: {
    pubkey: number[];
    expiration: string;
    targets?: string[];
  };
  signature: number[];
}

interface ProcessedDelegationIdentity {
  delegations: ProcessedDelegation[];
  userPublicKey: number[];
}

@Injectable()
export class IcpStrategy extends PassportStrategy(Strategy, 'icp') {
  private readonly logger = new Logger(IcpStrategy.name);

  constructor(private readonly challengeService: ChallengeService) {
    super();
  }

  async validate(req: any): Promise<IcpPayload> {
    const {
      sessionId,
      challenge,
      signature,
      publicKey,
      rootKey,
      delegationsIdentity,
    } = req.body;

    console.log('signature', signature);
    console.log('publicKey', publicKey);
    console.log('challenge', challenge);
    console.log('sessionId', sessionId);

    if (!sessionId || !challenge || !signature || !publicKey) {
      this.logger.warn('Missing required authentication data');
      throw new UnauthorizedException('Missing required authentication data');
    }

    // Get stored challenge
    const storedChallenge = this.challengeService.getChallenge(sessionId);
    if (!storedChallenge) {
      throw new UnauthorizedException('Invalid or expired challenge');
    }

    try {
      //Convert processed delegation back to DelegationChain format
      const processedIdentity =
        delegationsIdentity as ProcessedDelegationIdentity;

      const delegations = processedIdentity.delegations.map((d) => {
        const pubkey = new Uint8Array(d.delegation.pubkey).buffer;
        const expiration = BigInt(d.delegation.expiration);
        const targets = d.delegation.targets?.map((t) => Principal.fromText(t));

        return {
          delegation: new Delegation(pubkey, expiration, targets),
          signature: new Uint8Array(d.signature).buffer,
        };
      });

      const userPublicKey = processedIdentity.userPublicKey;

      // Convert delegation identity to DelegationChain
      const delegationChain = DelegationChain.fromDelegations(
        delegations as SignedDelegation[],
        new Uint8Array(processedIdentity.userPublicKey).buffer,
      );

      // Verify the signature and delegation chain
      const isValid = await isIdentitySignatureValid({
        challenge: Buffer.from(storedChallenge.challenge),
        signature: Buffer.from(signature, 'base64'),
        publicKey: Buffer.from(publicKey, 'base64'),
        delegationChain: delegationChain,
        rootKey: Buffer.from(rootKey, 'base64'),
      });

      console.log(
        'isValid',
        Principal.selfAuthenticating(Buffer.from(userPublicKey)).toText(),
      );
      return {
        principal: Principal.selfAuthenticating(
          Buffer.from(userPublicKey),
        ).toText(),
      };
    } catch (error) {
      this.logger.error('Error validating delegation', error);
      throw new UnauthorizedException('Invalid delegation or signature');
    }
  }
}

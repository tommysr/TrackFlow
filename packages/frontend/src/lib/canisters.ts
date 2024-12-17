import { createActor, canisterId } from '../../../declarations/canister';
import { canisterId as identityCanisterId } from '../../../declarations/internet_identity';
import { AuthClient } from '@dfinity/auth-client';
import canisterIds from '../../../../.dfx/local/canister_ids.json';
import { type _SERVICE } from '../../../declarations/canister/canister.did.js';
import { Principal } from '@dfinity/principal';
import { DelegationIdentity } from '@dfinity/identity';
import { arrayBufferToBase64, base64ToArrayBuffer } from './utils';
import { verify } from '@dfinity/agent';

const host = `http://localhost:4943`;
const maxTimeToLive = 60 * 60 * 24 * 7 * 1000 * 1000; // 7 days

export type Delegation = {
  delegation: {
    pubkey: Uint8Array;
    expiration: bigint;
    targets?: Principal[];
  };
  signature: Uint8Array;
};

export type DelegationsWithUserKey = {
  delegations: Delegation[];
  userKey: Uint8Array;
};

console.log('canisterId', canisterId);

export const anonymousBackend = createActor(canisterId, {
  agentOptions: { host },
});

interface AuthenticatedClient {
  actor: any;
  identity: DelegationIdentity;
  delegations: DelegationsWithUserKey;
  challenge?: ArrayBuffer;
}

interface ChallengeResponse {
  sessionId: string;
  challenge: string; // Base64 encoded challenge
}

// For local development, use this root key
const LOCAL_DFINITY_ROOT_KEY = new Uint8Array([
  48, 129, 130, 48, 29, 6, 13, 43, 6, 1, 4, 1, 130, 220, 124, 5, 3, 1, 2, 1, 6,
  12, 43, 6, 1, 4, 1, 130, 220, 124, 5, 3, 2, 1, 3, 97, 0, 151, 183, 101, 249,
  109, 236, 192, 193, 183, 2, 241, 182, 159, 111, 224, 58, 13, 161, 175, 115,
  202, 140, 247, 156, 56, 96, 193, 209, 109, 72, 130, 105, 189, 229, 214, 182,
  133, 115, 181, 1, 197, 167, 187, 142, 140, 112, 62, 141, 9, 126, 78, 94, 186,
  87, 52, 154, 141, 82, 186, 151, 124, 250, 56, 129, 222, 222, 136, 98, 154,
  227, 114, 244, 83, 104, 57, 9, 81, 142, 67, 167, 36, 193, 202, 155, 85, 77,
  46, 252, 161, 184, 101, 33, 78, 198, 33, 192,
]);

export const connect = async () => {
  let authClient = await AuthClient.create();

  // Get challenge and sessionId
  const challengeResponse = (await fetch(
    'http://localhost:5000/auth/challenge',
  ).then((res) => res.json())) as ChallengeResponse;

  const challenge = base64ToArrayBuffer(challengeResponse.challenge);

  const delegations = await new Promise<DelegationsWithUserKey>(
    (resolve, reject) => {
      authClient.login({
        identityProvider: `http://${identityCanisterId}.localhost:4943/`,
        maxTimeToLive: BigInt(maxTimeToLive),
        onSuccess: (response) => {
          resolve({
            delegations: response.delegations,
            userKey: response.userPublicKey,
          });
        },
        onError: reject,
      });
    },
  );

  const identity = authClient.getIdentity() as DelegationIdentity;

  // Sign the challenge
  const signature = await identity.sign(challenge);
  const publicKey = identity.getPublicKey().toDer();

  if (!publicKey) {
    throw new Error('Public key not found');
  }

  // Convert delegations to a format that can be safely stringified
  const processedDelegations = delegations.delegations.map((d) => ({
    delegation: {
      ...d.delegation,
      expiration: d.delegation.expiration.toString(),
      pubkey: Array.from(d.delegation.pubkey),
      targets: d.delegation.targets?.map((t) => t.toText()),
    },
    signature: Array.from(d.signature),
  }));

  // Send authentication request
  const response = await fetch('http://localhost:5000/auth/icp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sessionId: challengeResponse.sessionId,
      challenge: challengeResponse.challenge,
      signature: arrayBufferToBase64(signature),
      publicKey: arrayBufferToBase64(publicKey),
      rootKey: arrayBufferToBase64(LOCAL_DFINITY_ROOT_KEY),
      delegationsIdentity: {
        delegations: processedDelegations,
        userPublicKey: Array.from(delegations.userKey),
      },
    }),
  });

  console.log('response', response);

  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  // Create actor with authenticated identity
  const actor = createActor(canisterId, {
    agentOptions: {
      identity,
      host,
    },
  });

  return { actor, identity, delegations };
};

export const contractCanister = canisterIds.frontend.local;

import { createActor, canisterId } from '../../../declarations/canister';
import { canisterId as identityCanisterId } from '../../../declarations/internet_identity';
import { AuthClient } from '@dfinity/auth-client';
import canisterIds from '../../../../.dfx/local/canister_ids.json';
import { type _SERVICE } from '../../../declarations/canister/canister.did.js';
import { Principal } from '@dfinity/principal';
import { DelegationIdentity } from '@dfinity/identity';
import { arrayBufferToBase64, base64ToArrayBuffer } from './utils';

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


interface ChallengeResponse {
  sessionId: string;
  challenge: string; // Base64 encoded challenge
}

// For local development, use this root key
const LOCAL_DFINITY_ROOT_KEY = new Uint8Array([48, 129, 130, 48, 29, 6, 13, 43, 6, 1, 4, 1, 130, 220, 124, 5, 3, 1, 2, 1, 6, 12, 43, 6, 1, 4, 1, 130, 220, 124, 5, 3, 2, 1, 3, 97, 0, 160, 52, 35, 255, 163, 204, 33, 148, 197, 55, 101, 216, 252, 144, 171, 164, 27, 249, 123, 153, 200, 70, 45, 177, 253, 100, 177, 171, 52, 152, 211, 240, 88, 217, 54, 52, 74, 188, 126, 237, 204, 182, 93, 10, 92, 149, 201, 18, 23, 243, 202, 215, 115, 11, 165, 218, 176, 62, 146, 242, 133, 207, 231, 154, 110, 103, 43, 225, 168, 176, 98, 239, 120, 248, 86, 198, 69, 197, 47, 106, 201, 72, 159, 49, 39, 49, 200, 4, 115, 180, 198, 98, 57, 128, 201, 146])

// Add function to get stored token
export const getStoredToken = () => {
  return localStorage.getItem('api_token');
};

export const connect = async () => {
  let authClient = await AuthClient.create();

  // Get challenge and sessionId
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
      rootKey: arrayBufferToBase64(LOCAL_DFINITY_ROOT_KEY.buffer),
      delegationsIdentity: {
        delegations: processedDelegations,
        userPublicKey: Array.from(delegations.userKey),
      },
    }),
  });


  if (!response.ok) {
    throw new Error('Authentication failed');
  }

  const { accessToken } = await response.json();
  localStorage.setItem('api_token', accessToken);

  // Create actor with authenticated identity
  const actor = createActor(canisterId, {
    agentOptions: {
      identity,
      host,
    },
  });
  
  return { actor, identity, accessToken, delegations };
};

// Add helper function for authenticated requests
export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const token = getStoredToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};

export const contractCanister = canisterIds.frontend.local;

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
const LOCAL_DFINITY_ROOT_KEY = new Uint8Array([48, 129, 130, 48, 29, 6, 13, 43, 6, 1, 4, 1, 130, 220, 124, 5, 3, 1, 2, 1, 6, 12, 43, 6, 1, 4, 1, 130, 220, 124, 5, 3, 2, 1, 3, 97, 0, 134, 132, 116, 12, 194, 134, 22, 149, 9, 70, 212, 215, 130, 254, 115, 44, 218, 179, 31, 216, 214, 140, 191, 65, 228, 135, 195, 163, 217, 80, 200, 79, 237, 51, 130, 34, 92, 44, 61, 102, 43, 224, 69, 104, 204, 136, 249, 155, 24, 194, 43, 195, 101, 46, 191, 70, 173, 123, 105, 135, 216, 47, 122, 119, 117, 151, 125, 153, 146, 49, 118, 6, 99, 2, 49, 50, 35, 150, 52, 141, 91, 54, 50, 42, 240, 161, 141, 33, 164, 45, 12, 27, 14, 214, 232, 170])

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
export async function authenticatedFetch(url: string, init?: RequestInit) {
  const token = getStoredToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);
  
  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(error.message || 'Failed to fetch');
  }

  return response;
}

export const contractCanister = canisterIds.frontend.local;

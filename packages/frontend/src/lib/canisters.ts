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
const LOCAL_DFINITY_ROOT_KEY = new Uint8Array([48, 129, 130, 48, 29, 6, 13, 43, 6, 1, 4, 1, 130, 220, 124, 5, 3, 1, 2, 1, 6, 12, 43, 6, 1, 4, 1, 130, 220, 124, 5, 3, 2, 1, 3, 97, 0, 148, 96, 197, 140, 224, 145, 41, 136, 190, 250, 28, 18, 140, 151, 46, 73, 127, 184, 122, 178, 186, 64, 211, 29, 213, 38, 232, 223, 208, 127, 228, 75, 117, 70, 144, 242, 221, 171, 191, 60, 252, 42, 206, 226, 153, 9, 35, 173, 2, 55, 55, 13, 224, 201, 62, 172, 143, 37, 122, 0, 246, 131, 201, 182, 200, 40, 156, 171, 20, 6, 118, 114, 20, 183, 237, 206, 25, 226, 229, 214, 113, 116, 216, 207, 228, 150, 233, 85, 93, 137, 214, 124, 8, 238, 137, 40])

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

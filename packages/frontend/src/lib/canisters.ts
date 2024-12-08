import { createActor, canisterId } from '../../../declarations/canister';
import { canisterId as identityCanisterId } from '../../../declarations/internet_identity';
import { AuthClient } from '@dfinity/auth-client';
import canisterIds from '../../../../.dfx/local/canister_ids.json';
import { Actor, HttpAgent, type ActorSubclass } from '@dfinity/agent';
import {
  idlFactory,
  type _SERVICE,
} from '../../../declarations/canister/canister.did.js';

const host = `http://localhost:4943`;

export const anonymousBackend = createActor(canisterId, {
  agentOptions: { host },
});

export const createTestActor = async (
  canisterId: string,
  options: any,
): Promise<ActorSubclass<_SERVICE>> => {
  const agent = new HttpAgent({ ...options?.agentOptions });
  await agent.fetchRootKey();

  // Creates an actor with using the candid interface and the HttpAgent
  return Actor.createActor(idlFactory, {
    agent,
    canisterId,
    ...options?.actorOptions,
  });
};

export const connect = async () => {
  let authClient = await AuthClient.create();

  await new Promise((resolve) => {
    authClient.login({
      identityProvider: `http://${identityCanisterId}.localhost:4943/`, // 'https://identity.ic0.app'
      onSuccess: () => resolve(undefined),
    });
  });

  const identity = authClient.getIdentity();
  const actor = createActor(canisterId, {
    agentOptions: {
      identity,
      host,
    },
  });

  console.log('Connected to backend as', identity.getPrincipal().toText());

  return { actor, identity };
};


export const mockConnect = async () => {
  // const { actor, identity } = await connect();
  return { actor: undefined, identity: undefined };
};

export const contractCanister = canisterIds.frontend.local;

export const testContract = await createTestActor(contractCanister, {
  agentOptions: { host: 'http://localhost:4943', fetch },
});

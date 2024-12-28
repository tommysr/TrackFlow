import type { ActorSubclass, Identity } from '@dfinity/agent';
import { writable } from 'svelte/store';
import type { _SERVICE } from '../../../declarations/canister/canister.did';
import { connect } from './canisters';
import type { Delegation, DelegationsWithUserKey } from '$lib/canisters';

export const wallet = createWallet();

export let stateWallet: MaybeWallet = $state({
  connected: false,
  actor: undefined,
  identity: undefined,
  delegations: undefined,
});

export interface Wallet {
  connected: boolean;
  actor: ActorSubclass<_SERVICE>;
  identity: Identity;
  delegations: DelegationsWithUserKey;
}

export interface MaybeWallet {
  connected: boolean;
  actor: ActorSubclass<_SERVICE> | undefined;
  identity: Identity | undefined;
  delegations: DelegationsWithUserKey | undefined;
}

function createWallet() {
  const { subscribe, set, update } = writable<{ connected: false } | Wallet>({
    connected: false,
  });

  return {
    subscribe,
    connect: async () => {
      const { actor, identity, delegations } = await connect();
      const wallet = { connected: true, actor, identity, delegations };
      set(wallet);
      stateWallet.connected = true;
      stateWallet.actor = actor;
      stateWallet.identity = identity;
      stateWallet.delegations = delegations;
    },
  };
}

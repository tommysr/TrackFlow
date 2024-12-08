import type { ActorSubclass, Identity } from '@dfinity/agent';
import { get, writable } from 'svelte/store';
import type { _SERVICE } from '../../../declarations/canister/canister.did';
import { canisterId } from '../../../declarations/canister/index';
import { connect } from './canisters';
import { Principal } from '@dfinity/principal';

export const wallet = createWallet();

export let stateWallet: MaybeWallet = $state({
  connected: false,
  actor: undefined,
  identity: undefined,
});

export interface Wallet {
  connected: true;
  actor: ActorSubclass<_SERVICE>;
  identity: Identity;
}

export interface MaybeWallet {
  connected: boolean;
  actor: ActorSubclass<_SERVICE> | undefined;
  identity: Identity | undefined;
}

function createWallet() {
  const { subscribe, set, update } = writable<{ connected: false } | Wallet>({
    connected: false,
  });

  return {
    subscribe,
    connect: async () => {
      const { actor, identity } = await connect();
      console.log(identity.getPrincipal().toText());
      const wallet = { connected: true, actor, identity };
      set(wallet);
      stateWallet.connected = true;
      stateWallet.actor = actor;
      stateWallet.identity = identity;
    },
  };
}

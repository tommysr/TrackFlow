export const prerender = true;
export const ssr = false;

import type { Shipment } from '../../../declarations/canister/canister.did';
import { anonymousBackend } from '$lib/canisters';
import { stateWallet, wallet } from '$lib/wallet.svelte';
import type { LoadEvent } from '@sveltejs/kit';

/** @type {import('./$types').LayoutLoad } */
export async function load({ url }: LoadEvent): Promise<{
	pendingShipments: Shipment[];
	carried: Shipment[];
	created: Shipment[];
}> {
	let pendingShipments = await anonymousBackend.listPendingShipments();

	let carried: Shipment[] = [];
	let created: Shipment[] = [];

	if (stateWallet.actor) {
		let [car, cus] = await stateWallet.actor.listUserShipments();
		carried = car;
		created = cus;

	}

	if (stateWallet.connected) {
		pendingShipments = pendingShipments.filter(shipment => stateWallet.identity?.getPrincipal().compareTo(shipment.customer) != 'eq');
	}

	console.log('pendingShipments:', pendingShipments);
	console.log('carried:', carried);
	console.log('created:', created);

	return {
		pendingShipments,
		carried,
		created
	};
}
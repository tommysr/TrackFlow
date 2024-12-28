import type { Shipment } from '../../../../../declarations/canister/canister.did';
import { authenticatedFetch } from '$lib/canisters';
import { stateWallet } from '$lib/wallet.svelte';
import type { ExtendedShipment } from '$lib/extended.shipment';

/** @type {import('./$types').PageLoad} */
export async function load({ parent }): Promise<{
  pendingShipments: Shipment[];
  boughtShipments: ExtendedShipment[];
  inTransitShipments: ExtendedShipment[];
}> {
  const data = await parent();
  console.log(data);
  // Get ICP data
  const pendingShipments = data.pendingShipments.filter(
    (shipment: Shipment) => {
      const principal = stateWallet.identity?.getPrincipal();
      if (principal) {
        console.log(principal.toString(), shipment.customer.toString());
        return principal.compareTo(shipment.customer) == 'eq';
      }
      return false;
    },
  );

  console.log(pendingShipments);

  // Get additional data from backend for bought/transit shipments
  const boughtShipments: ExtendedShipment[] = [];
  const inTransitShipments: ExtendedShipment[] = [];

  if (stateWallet.actor) {
    const response = await authenticatedFetch(
      'http://localhost:5000/shipments/my-shipments',
    );
    const backendShipments = await response.json();

    // Merge ICP and backend data
    data.created
      .filter(
        (shipment) =>
          shipment.customer === stateWallet.identity?.getPrincipal(),
      )
      .forEach((shipment) => {
        const backendData = backendShipments.find(
          (bs: any) => bs.canisterShipmentId === shipment.id,
        );

        if (backendData) {
          const today = new Date();
          const pickupDate = new Date(backendData.pickupDate);
          const deliveryDate = new Date(backendData.deliveryDate);

          const extendedShipment: ExtendedShipment = {
            ...shipment,
            pickupDate,
            deliveryDate,
            lastUpdate: new Date(backendData.lastUpdate),
            eta: backendData.eta,
            currentLocation: backendData.currentLocation,
            routeSegment: backendData.routeSegment,
          };

          if (
            pickupDate.toDateString() === today.toDateString() ||
            deliveryDate.toDateString() === today.toDateString()
          ) {
            inTransitShipments.push(extendedShipment);
          } else {
            boughtShipments.push(extendedShipment);
          }
        }
      });
  }

  return {
    pendingShipments,
    boughtShipments,
    inTransitShipments,
  };
}

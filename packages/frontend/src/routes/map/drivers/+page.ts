import type { Shipment } from '../../../../../declarations/canister/canister.did';
import { authenticatedFetch } from '$lib/canisters';
import { stateWallet } from '$lib/wallet.svelte';
import type {
  BoughtShipment,
  BoughtShipmentResponse,
} from '$lib/extended.shipment';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({
  parent,
}): Promise<{
  boughtShipments: BoughtShipment[];
}> => {
  const data = await parent();

  // Get pending shipments from backend
  const icpCarrier: Shipment[] = data.carried;
  let myBoughtShipments: BoughtShipment[] = [];


  if (stateWallet.actor) {
    const response = await authenticatedFetch(
      'http://localhost:5000/shipments/my-carried',
    );

    if (response.ok) {
      const backendCarriedShipments: Array<BoughtShipmentResponse> =
        await response.json();

      console.log(backendCarriedShipments);

      myBoughtShipments = icpCarrier
        .map((shipment) => {
          const backendData = backendCarriedShipments.find(
            (bs) => bs.canisterShipmentId.toString() === shipment.id.toString(),
          );

          console.log(backendData);

          if (!backendData) {
            return null;
          }

          return {
            ...shipment,
            status: backendData.status,
            trackingToken: backendData.trackingToken,
            pickup: backendData.pickup,
            delivery: backendData.delivery,
            assignedCarrier: backendData.assignedCarrier,
            estimatedPickupDate: backendData.estimatedPickupDate,
            estimatedDeliveryDate: backendData.estimatedDeliveryDate,
            pickupTimeWindow: backendData.pickupTimeWindow,
            deliveryTimeWindow: backendData.deliveryTimeWindow,
          };
        })
        .filter((shipment) => shipment !== null);
    }
  }

  return {
    boughtShipments: myBoughtShipments,
  };
};

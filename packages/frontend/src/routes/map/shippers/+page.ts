import type { Shipment } from '../../../../../declarations/canister/canister.did';
import { authenticatedFetch } from '$lib/canisters';
import { stateWallet } from '$lib/wallet.svelte';
import type {
  BoughtShipment,
  BoughtShipmentResponse,
  InTransitShipment,
  InTransitShipmentResponse,
  PendingShipment,
  PendingShipmentResponse,
} from '$lib/extended.shipment';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({
  parent,
}): Promise<{
  pendingShipments: PendingShipment[];
  boughtShipments: BoughtShipment[];
  inTransitShipments: InTransitShipment[];
}> => {
  const data = await parent();

  // Get pending shipments from backend
  const icpCreatedShipments: Shipment[] = data.created;
  let myPendingShipments: PendingShipment[] = [];
  let myBoughtShipments: BoughtShipment[] = [];
  let myInTransitShipments: InTransitShipment[] = [];

  if (stateWallet.actor) {
    const response = await authenticatedFetch(
      'http://localhost:5000/shipments/my-pending',
    );

    if (response.ok) {
      const backendPendingShipments: Array<PendingShipmentResponse> =
        await response.json();

      myPendingShipments = icpCreatedShipments
        .map((shipment) => {
          const backendData = backendPendingShipments.find(
            (bs) => bs.canisterShipmentId === shipment.id.toString(),
          );

          if (!backendData) {
            return null;
          }

          return {
            ...shipment,
            status: backendData.status,
            trackingToken: backendData.trackingToken,
            pickup: backendData.pickup,
            delivery: backendData.delivery,
          };
        })
        .filter((shipment) => shipment !== null);
    }

    const responseBought = await authenticatedFetch(
      'http://localhost:5000/shipments/my-bought',
    );

    if (responseBought.ok) {
      const backendBoughtShipments: Array<BoughtShipmentResponse> =
        await responseBought.json();

      myBoughtShipments = icpCreatedShipments
        .map((shipment) => {
          const backendData = backendBoughtShipments.find(
            (bs) => bs.canisterShipmentId === shipment.id.toString(),
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
          };
        })
        .filter((shipment) => shipment !== null);
    }

    const responseInTransit = await authenticatedFetch(
      'http://localhost:5000/shipments/my-in-route',
    );

    if (responseInTransit.ok) {
      const backendInTransitShipments: Array<InTransitShipmentResponse> =
        await responseInTransit.json();

      myInTransitShipments = icpCreatedShipments
        .map((shipment) => {
          const backendData = backendInTransitShipments.find(
            (bs) => bs.canisterShipmentId === shipment.id.toString(),
          );

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
            actualPickupDate: backendData.actualPickupDate,
            actualDeliveryDate: backendData.actualDeliveryDate,
          };
        })
        .filter((shipment) => shipment !== null);
    }
  }

  return {
    pendingShipments: myPendingShipments,
    boughtShipments: myBoughtShipments,
    inTransitShipments: myInTransitShipments,
  };
};

import type { Shipment } from '../../../../../declarations/canister/canister.did';
import { authenticatedFetch } from '$lib/canisters';
import { stateWallet } from '$lib/wallet.svelte';
import type {
  BoughtShipment,
  BoughtShipmentResponse,
  InTransitShipment,
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

      myBoughtShipments = icpCreatedShipments.map((shipment) => {
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
      }).filter((shipment) => shipment !== null);
    }
  }

  console.log(myPendingShipments);

  // Get additional data from backend for bought/transit shipments

  // if (stateWallet.actor) {
  //   const response = await authenticatedFetch(
  //     'http://localhost:5000/shipments/my-shipments',
  //   );
  //   const backendShipments = await response.json();

  //   // Merge ICP and backend data
  //   data.created
  //     .filter(
  //       (shipment) =>
  //         shipment.customer === stateWallet.identity?.getPrincipal(),
  //     )
  //     .forEach((shipment) => {
  //       const backendData = backendShipments.find(
  //         (bs: any) => bs.canisterShipmentId === shipment.id,
  //       );

  //       if (backendData) {
  //         const today = new Date();
  //         const pickupDate = new Date(backendData.pickupDate);
  //         const deliveryDate = new Date(backendData.deliveryDate);

  //         const extendedShipment: ExtendedShipment = {
  //           ...shipment,
  //           pickupDate,
  //           deliveryDate,
  //           lastUpdate: new Date(backendData.lastUpdate),
  //           eta: backendData.eta,
  //           currentLocation: backendData.currentLocation,
  //           routeSegment: backendData.routeSegment,
  //           trackingToken: backendData.trackingToken
  //         };

  //         if (
  //           pickupDate.toDateString() === today.toDateString() ||
  //           deliveryDate.toDateString() === today.toDateString()
  //         ) {
  //           inTransitShipments.push(extendedShipment);
  //         } else {
  //           boughtShipments.push(extendedShipment);
  //         }
  //       }
  //     });
  // }

  return {
    pendingShipments: myPendingShipments,
    boughtShipments: myBoughtShipments,
    inTransitShipments: myInTransitShipments,
  };
};

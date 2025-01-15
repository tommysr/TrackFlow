import type {
  Shipment,
  ShipmentInfo,
} from '../../../declarations/canister/canister.did';

export type BackendStatus =
  | 'PENDING_NO_ADDRESS'
  | 'PENDING_WITH_ADDRESS'
  | 'BOUGHT_NO_ADDRESS'
  | 'BOUGHT_WITH_ADDRESS'
  | 'READY_FOR_PICKUP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export  interface AddressResponse {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface LocationResponse {
  lat: number;
  lng: number;
}

export interface AddressLocationResponse {
  address: AddressResponse | null;
  location: LocationResponse | null;
  isComplete: boolean;
}

export interface CarrierResponse {
  name: string;
  principal: string;
}

// Base interface extending ICP Shipment
export interface BaseShipmentResponse {
  canisterShipmentId: string; // fix this to be bigint/number
  status: BackendStatus;
  value: string; // fix this to be number
  price: string; // fix this to be number
}

// Pending shipments
export interface PendingShipmentResponse extends BaseShipmentResponse {
  pickup: AddressLocationResponse;
  delivery: AddressLocationResponse;
  trackingToken?: string;
}

// Bought shipments
export interface BoughtShipmentResponse extends PendingShipmentResponse {
  estimatedPickupDate?: Date;
  estimatedDeliveryDate?: Date;
  assignedCarrier: CarrierResponse;
}

// In transit shipments
export interface InTransitShipmentResponse extends BoughtShipmentResponse {
  estimatedPickupDate?: Date;
  estimatedDeliveryDate?: Date;
  currentLocation?: LocationResponse;
  lastUpdate?: Date;
  eta?: number;
  routeSegment?: LocationResponse[];
}

// CONCATENATING SHIPMENT RESPONSE WITH ICP SHIPMENT

// Base interface extending ICP Shipment
export interface BaseShipment
  extends Omit<BaseShipmentResponse, 'canisterShipmentId' | 'value' | 'price'>,
    Omit<Shipment, 'status'> {}
export interface PendingShipment
  extends Omit<
      PendingShipmentResponse,
      'value' | 'price' | 'canisterShipmentId'
    >,
    Omit<Shipment, 'status'> {}

export interface BoughtShipment
  extends Omit<
      BoughtShipmentResponse,
      'value' | 'price' | 'canisterShipmentId'
    >,
    Omit<Shipment, 'status'> {}

export interface InTransitShipment
  extends Omit<
      InTransitShipmentResponse,
      'value' | 'price' | 'canisterShipmentId'
    >,
    Omit<Shipment, 'status'> {}

// Type guard functions
export function isPendingShipment(
  shipment: PendingShipment | BoughtShipment | InTransitShipment,
): shipment is PendingShipment {
  return shipment.pickup !== undefined && shipment.delivery !== undefined;
}

export function isBoughtShipment(
  shipment: PendingShipment | BoughtShipment | InTransitShipment,
): shipment is BoughtShipment {
  return (shipment as BoughtShipment).assignedCarrier !== undefined;
}

export function isInTransitShipment(
  shipment: PendingShipment | BoughtShipment | InTransitShipment,
): shipment is InTransitShipment {
  return (shipment as InTransitShipment).status === 'IN_TRANSIT' || shipment.status === 'PICKED_UP';
}

export enum RouteOperationType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
  BOTH = 'both',
}

export interface ShipmentRouteOperation {
  type: RouteOperationType;
  id: number;
}

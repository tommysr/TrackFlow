import type {
  Shipment,
  ShipmentInfo,
} from '../../../declarations/canister/canister.did';

export type BackendStatus =
  | 'PENDING'
  | 'BOUGHT'
  | 'ROUTE_SET'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED';

export interface AddressResponse {
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface LocationResponse {
  lat: number;
  lng: number;
}

export interface AddressLocationResponse extends LocationResponse {
  address: AddressResponse;
}

export interface CarrierResponse {
  name: string;
  principal: string;
}

// Base interface extending ICP Shipment
export interface BaseShipmentResponse {
  canisterShipmentId: string; // fix this to be bigint/number
  status: BackendStatus;
  value: number; // fix this to be number
  price: number; // fix this to be number
}

// Pending shipments
export interface PendingShipmentResponse extends BaseShipmentResponse {
  pickup?: AddressLocationResponse;
  delivery?: AddressLocationResponse;
  trackingToken?: string;
}

export interface TimeWindow {
  start: Date;
  end: Date;
}

// Bought shipments
export interface BoughtShipmentResponse extends PendingShipmentResponse {
  assignedCarrier: CarrierResponse;
  estimatedPickupDate?: string;
  estimatedDeliveryDate?: string;
  pickupTimeWindow?: TimeWindow;
  deliveryTimeWindow?: TimeWindow;
}

// In transit shipments
export interface InTransitShipmentResponse extends BoughtShipmentResponse {
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
  return (
    (shipment as InTransitShipment).status === 'IN_TRANSIT' ||
    shipment.status === 'PICKED_UP'
  );
}

export enum RouteOperationType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
  BOTH = 'both',
}

export interface ShipmentRouteOperation {
  type: RouteOperationType;
  id: string;
}

import type { BackendStatus, AddressLocationResponse, LocationResponse } from '../extended.shipment';

export interface PublicShipmentTrackingDto {
  status: BackendStatus;
  pickup?: AddressLocationResponse;
  delivery?: AddressLocationResponse;
  estimatedPickupDate?: string;
  estimatedDeliveryDate?: string;
  currentLocation?: LocationResponse;
  lastUpdate?: string;
  isPickupPhase: boolean;
  isNearby: boolean;
  activeSegment?: {
    points: LocationResponse[];
  };
} 
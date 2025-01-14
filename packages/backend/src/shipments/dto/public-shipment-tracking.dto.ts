import { ShipmentStatus } from "../entities/shipment.entity";

export class PublicShipmentTrackingDto {
  status: ShipmentStatus;
  estimatedPickupDate?: Date;
  estimatedDeliveryDate?: Date;
  
  // Only available when near delivery
  currentLocation?: {
    lat: number;
    lng: number;
  };
  lastUpdate?: Date;
  eta?: number;
  routeSegment?: {
    points: Array<{ lat: number; lng: number }>;
  };
}
import { ShipmentStatus } from '../entities/shipment.entity';

export class ShipmentResponseDto {
  id: string;
  canisterShipmentId: string;
  status: ShipmentStatus;
  value: string;
  price: string;
  
  // Optional fields since they might not always be available
  pickupDate?: Date;
  deliveryDate?: Date;
  lastUpdate?: Date;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  eta?: number;
  routeSegment?: {
    points: Array<{ lat: number; lng: number }>;
  };
} 
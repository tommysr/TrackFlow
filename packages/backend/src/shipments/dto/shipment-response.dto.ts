import { ShipmentStatus } from '../entities/shipment.entity';

export class BaseShipmentResponseDto {
  canisterShipmentId: number;
  status: ShipmentStatus;
  value: number;
  price: number;
}

export class AddressResponseDto {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export class LocationResponseDto {
  lat: number;
  lng: number;
}

export class AddressLocationResponseDto {
  address: AddressResponseDto | null;
  location: LocationResponseDto;
  isComplete: boolean;
}

export class CarrierResponseDto {
  name: string;
  principal: string;
}

export class PendingShipmentResponseDto extends BaseShipmentResponseDto {
  pickup: AddressLocationResponseDto;
  delivery: AddressLocationResponseDto;
  trackingToken?: string;
}

export class BoughtShipmentResponseDto extends PendingShipmentResponseDto {
  estimatedPickupDate?: Date;
  estimatedDeliveryDate?: Date;
  assignedCarrier: CarrierResponseDto;
}

export class InTransitShipmentResponseDto extends BaseShipmentResponseDto {
  estimatedPickupDate?: Date;
  estimatedDeliveryDate?: Date;
  currentLocation?: {
    lat: number;
    lng: number;
  };
  lastUpdate?: Date;
  eta?: number;
  routeSegment?: Array<{ lat: number; lng: number }>;
}

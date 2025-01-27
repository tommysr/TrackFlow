import { ShipmentStatus } from '../entities/shipment.entity';
import { AddressLocationResponseDto } from './address-location.dto';

export class BaseShipmentResponseDto {
  canisterShipmentId: string;
  status: ShipmentStatus;
  value: number;
  price: number;
}

export class CarrierResponseDto {
  name: string;
  principal: string;
}

export class GeocodeResponseDto {
  pickup: AddressLocationResponseDto;
  delivery: AddressLocationResponseDto;
}

export class PendingShipmentResponseDto extends BaseShipmentResponseDto {
  pickup?: AddressLocationResponseDto;
  delivery?: AddressLocationResponseDto;
  trackingToken?: string;
}

export class BoughtShipmentResponseDto extends PendingShipmentResponseDto {
  estimatedPickupDate?: Date;
  estimatedDeliveryDate?: Date;
  assignedCarrier: CarrierResponseDto;
}

export class CarriedShipmentResponseDto extends BoughtShipmentResponseDto {}

export class InTransitShipmentResponseDto extends BoughtShipmentResponseDto {
  actualDeliveryDate?: Date;
  actualPickupDate?: Date;
}

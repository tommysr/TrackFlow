import { ShipmentStatus } from "../entities/shipment.entity";
import { LocationDto } from "src/common/dto/location.dto";
import { AddressLocationResponseDto } from "./address-location.dto";

export class RouteSegmentDto {
  points: Array<LocationDto>;
}

export class PublicShipmentTrackingDto {
  status: ShipmentStatus;
  estimatedPickupDate?: Date;
  estimatedDeliveryDate?: Date;
  
  carrierName?: string;
  currentLocation?: LocationDto;
  lastUpdate?: Date;
  
  remainingDistance: number;
  remainingDuration: number;
  isPickupPhase: boolean;
  isNearby: boolean;

  pickup?: AddressLocationResponseDto;
  delivery?: AddressLocationResponseDto;
  
  // Only present when carrier is nearby
  activeSegment?: RouteSegmentDto;
}
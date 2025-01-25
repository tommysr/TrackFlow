import { ShipmentStatus } from "../entities/shipment.entity";
import { LocationDto } from "src/common/dto/location.dto";

export class RouteSegmentDto {
  points: Array<LocationDto>;
}

export class PublicShipmentTrackingDto {
  status: ShipmentStatus;
  estimatedPickupDate?: Date;
  estimatedDeliveryDate?: Date;
  
  // Only available when near delivery
  currentLocation?: LocationDto;
  lastUpdate?: Date;
  eta?: number;
  routeSegment?: RouteSegmentDto;
}
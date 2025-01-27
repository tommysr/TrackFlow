export enum RouteStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface RouteMetrics {
  completedStops: number;
  totalStops: number;
  completedDistance: number;
  remainingDistance: number;
  isDelayed: boolean;
  delayMinutes?: number;
}

export interface Route {
  id: string;
  totalDistance: number;
  totalFuelCost: number;
  fuelConsumption: number;
  estimatedTime: number;
  date: string;
  status: RouteStatus;
  metrics: RouteMetrics;
  stops: RouteStop[];
  startedAt?: string;
  updatedAt?: string;
  lastLocationUpdate?: string;
  fullPath: {
    type: 'LineString';
    coordinates: [number, number][];
  };
  completedAt?: string;
  lastLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface RouteWithActivation {
  route: Route;
  latestActivationTime: string;
}

export interface RouteStop {
  id: string;
  shipmentId?: string;
  stopType: 'PICKUP' | 'DELIVERY' | 'START' | 'END';
  sequenceIndex: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  estimatedArrival: string;
  actualArrival?: string;
  shipment?: {
    id: string;
    canisterShipmentId: string;
  };
}

export interface RouteDelay {
  id: string;
  delayMinutes: number;
  recordedAt: Date;
}

export type MarkerType = 'S' | 'E' | 'P' | 'D' | 'C';

export enum ShipmentStatus {
  BOUGHT = 'BOUGHT',
  ROUTE_SET = 'ROUTE_SET',
  PICKED_UP = 'PICKED_UP',
  IN_DELIVERY = 'IN_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export interface Shipment {
  id: string;
  canisterShipmentId: string;
  status: ShipmentStatus;
  pickupAddress?: {
    lat: number;
    lng: number;
  };
  deliveryAddress?: {
    lat: number;
    lng: number;
  };
  pickupTimeWindow?: {
    start: string;
    end: string;
  };
  deliveryTimeWindow?: {
    start: string;
    end: string;
  };
}

export interface RouteProgress {
  completedStops: number;
  totalStops: number;
  completedDistance: number;
  remainingDistance: number;
  isDelayed: boolean;
  delayMinutes?: number;
  nextStopEta?: Date;
}

export interface GeoLineString {
  type: 'LineString';
  coordinates: [number, number][]; // Array of [longitude, latitude] pairs
}

export interface RouteSegmentUpdate {
  fromStopId: string;
  toStopId: string;
  path: GeoLineString;
  distance: number;
  duration: number;
}

export interface StopUpdate {
  id: string;
  estimatedArrival: Date;
}

export interface LocationUpdate {
  updatedRoute: Route;
  updatedStops: RouteStop[];
  updatedShipments: Shipment[];
  updatedSegments: RouteSegmentUpdate[];
  updatedStopsWithNewETAs: StopUpdate[];
  delays: RouteDelay[];
}

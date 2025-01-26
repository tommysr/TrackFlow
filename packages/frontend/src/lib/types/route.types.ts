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
  fullPath: {
    type: 'LineString';
    coordinates: [number, number][];
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

export interface LocationUpdate {
  updatedRoute: Route;
  updatedStops: RouteStop[];
  delays: RouteDelay[];
  updatedShipments: Shipment[];
}

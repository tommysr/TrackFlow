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
  fullPath: {
    type: 'LineString';
    coordinates: [number, number][];
  };
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
export enum RouteStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface RouteMetrics {
  progress?: {
    completedStops: number;
    totalStops: number;
    completedDistance: number;
    remainingDistance: number;
    isDelayed: boolean;
  };
}

export interface Route {
  id: string;
  totalDistance: number;
  totalFuelCost: number;
  fuelConsumption: number;
  estimatedTime: number;
  date: string;
  status: RouteStatus;
  metrics?: RouteMetrics;
  stops?: RouteStop[];
  startedAt?: string;
  fullPath: {
    type: 'LineString';
    coordinates: [number, number][];
  };
}

export interface RouteStop {
  id: string;
  shipmentId: number;
  stopType: 'PICKUP' | 'DELIVERY' | 'START' | 'END';
  sequenceIndex: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  estimatedArrival: string;
  actualArrival?: string;
} 
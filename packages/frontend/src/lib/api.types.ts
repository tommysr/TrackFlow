import type { RouteOperationType } from './extended.shipment';

export interface CreateRouteDto {
  shipments: Array<{
    id: number;
    type: RouteOperationType;
  }>;
  estimatedStartTime: string;
}

export interface RouteResponse {
  id: string;
  totalDistance: number;
  totalFuelCost: number;
  estimatedTime: number;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  // ... other fields you need
} 
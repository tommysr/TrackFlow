import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

export enum StopType {
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY',
  START = 'START',
  END = 'END',
}

export interface Location {
  lat: number;
  lng: number;
  type: StopType;
  shipmentId?: string;
}

export interface RouteStep {
  distance: number;
  duration: number;
  type: number;
  instruction: string;
  name: string;
  way_points: number[]; // Changed from wayPoints to match API response
}

export interface RouteGeometry {
  coordinates: [number, number][]; // Array of [longitude, latitude] pairs
  type: string;
}

export interface RouteFeature {
  bbox: number[];
  type: string;
  properties: {
    segments: {
      distance: number;
      duration: number;
      steps: RouteStep[];
    }[];
    way_points: number[];
    summary: {
      distance: number;
      duration: number;
    };
  };
  geometry: RouteGeometry;
}

export interface RouteResponse {
  type: string;
  bbox: number[];
  features: RouteFeature[];
  metadata: any;
}

export interface RouteSegment {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: RouteGeometry;
}

export interface RouteOptimizationResult {
  optimizedPoints: Location[];
  totalDistance: number; // kilometers
  totalTime: number; // minutes
  segments: RouteSegment[];
  matrix: {
    durations: number[][]; // seconds
    distances: number[][]; // meters
  };
  geometry?: RouteGeometry; // pass route geometry to frontend
}

@Injectable()
export class RouteOptimizationService {
  private readonly logger = new Logger(RouteOptimizationService.name);
  private readonly routingApiKey: string;
  private readonly baseUrl = 'https://api.openrouteservice.org/v2';

  constructor(private configService: ConfigService) {
    this.routingApiKey = this.configService.get('routing.apiKey');
    console.log('this.routingApiKey', this.routingApiKey);
  }

  async optimizeRoute(locations: Location[]): Promise<RouteOptimizationResult> {
    try {
      const matrix = await this.getDistanceMatrix(locations);
      console.log('matrix', matrix);
      
      // Ensure start location is first in the optimization
      const optimizedOrder = this.calculateOptimalOrderWithConstraints(
        matrix.durations,
        locations,
      );
      console.log('optimizedOrder', optimizedOrder);
      const orderedLocations = optimizedOrder.map((i) => locations[i]);
      const route = await this.getDetailedRoute(orderedLocations);
      console.log('route', route);
      const segments = this.extractSegments(route.data);
      
      return {
        optimizedPoints: orderedLocations,
        totalDistance: route.data.features[0].properties.summary.distance / 1000,
        totalTime: route.data.features[0].properties.summary.duration / 60,
        segments,
        matrix: {
          durations: matrix.durations,
          distances: matrix.distances,
        },
        geometry: route.data.features[0].geometry,
      };
    } catch (error) {
      this.logger.error('Route optimization failed', error);
      throw new Error('Route optimization failed: ' + error.message);
    }
  }

  private calculateOptimalOrderWithConstraints(
    durations: number[][],
    locations: Location[],
  ): number[] {
    const n = locations.length;
    const visited = new Set<number>();
    const order: number[] = [];

    // Find start location index
    const startIndex = locations.findIndex(loc => loc.type === 'START');
    if (startIndex !== -1) {
      visited.add(startIndex);
      order.push(startIndex);
    }

    // Create a map of shipment IDs to their pickup/delivery indices
    const shipments = new Map<number, { pickup: number; delivery: number }>();
    locations.forEach((loc, idx) => {
      if (loc.type === 'PICKUP' && loc.shipmentId) {
        shipments.set(Number(loc.shipmentId), { pickup: idx, delivery: -1 });
      } else if (loc.type === 'DELIVERY' && loc.shipmentId) {
        const shipment = shipments.get(Number(loc.shipmentId));
        if (shipment) {
          shipment.delivery = idx;
        }
      }
    });

    // Find end location index
    const endIndex = locations.findIndex(loc => loc.type === 'END');

    while (visited.size < n - (endIndex !== -1 ? 1 : 0)) {
      let bestNext = -1;
      let bestDuration = Infinity;
      const current = order[order.length - 1];

      // Try all unvisited locations as next point
      for (let i = 0; i < n; i++) {
        if (visited.has(i) || i === endIndex) continue;

        const location = locations[i];
        if (location.shipmentId) {
          const shipment = shipments.get(Number(location.shipmentId));
          // Skip if this is a delivery and its pickup hasn't been visited yet
          if (location.type === 'DELIVERY' && !visited.has(shipment.pickup)) {
            continue;
          }
        }

        const durationToPoint = durations[current][i];
        if (durationToPoint < bestDuration) {
          bestDuration = durationToPoint;
          bestNext = i;
        }
      }

      if (bestNext === -1) break;
      visited.add(bestNext);
      order.push(bestNext);
    }

    // Add end location last if it exists
    if (endIndex !== -1) {
      order.push(endIndex);
    }

    return order;
  }

  private async getDistanceMatrix(locations: Location[]) {
    const response = await axios.post(
      `${this.baseUrl}/matrix/driving-car`,
      {
        locations: locations.map((loc) => [loc.lng, loc.lat]),
        metrics: ['duration', 'distance'],
      },
      {
        headers: {
          Authorization: this.routingApiKey,
          'Content-Type': 'application/json',
        },
      },
    );

    return {
      durations: response.data.durations as number[][],
      distances: response.data.distances as number[][],
    };
  }

  async getDetailedRoute(locations: Location[]) {
    console.log('locations', locations);
    console.log('this.routingApiKey', this.routingApiKey);
    return axios.post(
      `${this.baseUrl}/directions/driving-car/geojson`,
      {
        coordinates: locations.map((loc) => [loc.lng, loc.lat]),
        options: {
          avoid_features: ['highways', 'tollways'],
        },
      },
      {
        headers: {
          Authorization: this.routingApiKey,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  private extractSegments(routeData: RouteResponse): RouteSegment[] {
    const fullCoordinates = routeData.features[0].geometry.coordinates;
    const segments: RouteSegment[] = [];
    
    routeData.features[0].properties.segments.forEach((segment, index) => {
      // Get start and end indices from way_points
      const startIdx = segment.steps[0].way_points[0];
      const endIdx = segment.steps[segment.steps.length - 1].way_points[1];
      
      // Extract coordinates for this segment
      const segmentCoordinates = fullCoordinates.slice(startIdx, endIdx + 1);
      
      segments.push({
        distance: segment.distance,
        duration: segment.duration,
        geometry: {
          type: 'LineString',
          coordinates: segmentCoordinates
        }
      });
    });
    
    return segments;
  }
}

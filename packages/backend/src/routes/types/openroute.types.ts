import { GeoLineString } from './location.types';

export interface RouteStep {
  distance: number;
  duration: number;
  type: number;
  instruction: string;
  name: string;
  way_points: number[];
}

export interface RouteSegmentProperties {
  distance: number;
  duration: number;
  steps: RouteStep[];
  geometry: GeoLineString;
}

export interface RouteFeature {
  bbox: number[];
  type: string;
  properties: {
    segments: RouteSegmentProperties[];
    way_points: number[];
    summary: {
      distance: number;
      duration: number;
    };
  };
  geometry: GeoLineString;
}

export interface OpenRouteResponse {
  type: string;
  bbox: number[];
  features: RouteFeature[];
  metadata: any;
} 
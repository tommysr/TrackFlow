export enum StopType {
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY',
  START = 'START',
  END = 'END',
}

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoLineString {
  type: 'LineString';
  coordinates: [number, number][]; // Array of [longitude, latitude] pairs
} 
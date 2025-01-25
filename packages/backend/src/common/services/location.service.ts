import { Injectable } from '@nestjs/common';
import { LocationDto } from '../dto/location.dto';

@Injectable()
export class LocationService {
  calculateDistance(source: LocationDto, destination: LocationDto): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(destination.lat - source.lat);
    const dLon = this.toRad(destination.lng - source.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(source.lat)) *
        Math.cos(this.toRad(destination.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  isPointNearby(
    source: LocationDto,
    destination: LocationDto,
    thresholdKm: number = 0.1,
  ): boolean {
    const distance = this.calculateDistance(source, destination);
    return distance <= thresholdKm;
  }

  isPointPassed(
    point: LocationDto,
    currentLocation: LocationDto,
    thresholdKm: number = 0.1,
  ): boolean {
    return this.isPointNearby(point, currentLocation, thresholdKm);
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }
}

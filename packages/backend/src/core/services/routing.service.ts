import { Injectable } from '@nestjs/common';
import { LocationDto } from 'src/common/dto/location.dto';
import { RouteStop } from 'src/routes/entities/routeStop.entity';
import { RouteOptimizationService } from 'src/routes/route-optimization.service';
import { StopType } from 'src/routes/types/location.types';
import { GeoPoint, GeoLineString } from 'src/routes/types/location.types';

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

export interface RouteUpdateResult {
  remainingDistance: number;
  remainingDuration: number;
  segments: RouteSegmentUpdate[];
  updatedStops: StopUpdate[];
  routeGeometry: GeoLineString;
}

@Injectable()
export class RoutingService {
  constructor(
    private readonly routeOptimizationService: RouteOptimizationService,
  ) {}

  async calculateRouteUpdate(
    currentLocation: LocationDto,
    stops: RouteStop[],
  ): Promise<RouteUpdateResult> {
    
    const remainingStops = stops
      .filter((stop) => !stop.actualArrival && stop.stopType !== StopType.START)
      .sort((a, b) => a.sequenceIndex - b.sequenceIndex);

    if (remainingStops.length === 0) {
      return {
        remainingDistance: 0,
        remainingDuration: 0,
        segments: [],
        updatedStops: [],
        routeGeometry: null,
      };
    }

    // Calculate new route from current location to all remaining stops
    const routeDetails = await this.routeOptimizationService.getDetailedRoute([
      {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        type: StopType.START,
      },
      ...remainingStops.map((stop) => ({
        lat: (stop.location as GeoPoint).coordinates[1],
        lng: (stop.location as GeoPoint).coordinates[0],
        type: stop.stopType as StopType,
        shipmentId: stop.shipmentId,
      })),
    ]);

    // Extract route summary
    const { distance, duration } =
      routeDetails.data.features[0].properties.summary;

    // Calculate expected arrival times based on current progress
    let cumulativeTime = 0;
    const updatedStops: StopUpdate[] = [];
    const segments: RouteSegmentUpdate[] = [];

    const routeSegments = routeDetails.data.features[0].properties.segments;
    const routeGeometry = routeDetails.data.features[0].geometry;

    // Use current time as the base for expected arrival calculations
    const now = new Date();

    routeSegments.forEach((segment, index) => {
      const startIdx = segment.steps[0].way_points[0];
      const endIdx = segment.steps[segment.steps.length - 1].way_points[1];
      const segmentCoordinates = routeGeometry.coordinates.slice(startIdx, endIdx + 1);

      cumulativeTime += Number(segment.duration);
      const stop = remainingStops[index];

      if (stop) {
        // Calculate expected arrival time based on current location and route
        const expectedArrival = new Date(now.getTime() + cumulativeTime * 1000);
        updatedStops.push({
          id: stop.id,
          estimatedArrival: expectedArrival,
        });
      }

      // Create segment for all stops including the last one
      if (index < routeSegments.length) {
        const nextStop = remainingStops[index + 1];
        if (nextStop) {
          segments.push({
            fromStopId: remainingStops[index].id,
            toStopId: nextStop.id,
            path: {
              type: 'LineString',
              coordinates: segmentCoordinates
            },
            distance: Number(segment.distance) / 1000,
            duration: Number(segment.duration) / 60,
          });
        }
      }
    });

    return {
      remainingDistance: distance / 1000, // Convert to km
      remainingDuration: duration / 60, // Convert to minutes
      segments,
      updatedStops,
      routeGeometry,
    };
  }
}

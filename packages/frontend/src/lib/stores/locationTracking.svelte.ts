import { authenticatedFetch } from '$lib/canisters';
import type { Route, RouteStop, RouteDelay } from '../types/route.types';

interface RouteProgress {
  completedStops: number;
  totalStops: number;
  completedDistance: number;
  remainingDistance: number;
  isDelayed: boolean;
  delayMinutes?: number;
  nextStopEta?: Date;
}

interface LocationUpdate {
  updatedRoute: Route;
  updatedStops: RouteStop[];
  delays: RouteDelay[];
}

export class LocationTrackingStore {
  isTracking = $state(false);
  error = $state<string | null>(null);
  lastUpdate = $state<Date | null>(null);
  lastLocation = $state<{ latitude: number; longitude: number } | null>(null);
  isTestMode = $state(false);
  routeProgress = $state<RouteProgress | null>(null);
  lastLocationUpdate = $state<LocationUpdate | null>(null);
  
  private intervalId: NodeJS.Timeout | null = null;

  async updateLocation() {
    if (!("geolocation" in navigator)) {
      this.error = "Geolocation is not supported";
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Update location
          const response = await authenticatedFetch('http://localhost:5000/routes/active/location', {
            method: 'POST',
            body: JSON.stringify({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              timestamp: new Date().toISOString()
            })
          });
          
          if (response.ok) {
            this.lastLocationUpdate = await response.json();
            
            // Get route progress
            const progressResponse = await authenticatedFetch('http://localhost:5000/routes/active/progress');
            if (progressResponse.ok) {
              this.routeProgress = await progressResponse.json();
            }

            this.error = null;
            this.lastUpdate = new Date();
            this.lastLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
          }
        } catch (error) {
          this.error = "Failed to update location";
        }
      },
      (error) => {
        this.error = "Failed to get location";
      }
    );
  }

  startTracking() {
    this.isTracking = true;
    if (!this.isTestMode) {
      this.updateLocation();
      this.intervalId = setInterval(() => this.updateLocation(), 30000);
    }
  }

  stopTracking() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.isTracking = false;
    this.routeProgress = null;
    this.lastLocationUpdate = null;
  }

  toggleTestMode() {
    this.isTestMode = !this.isTestMode;
  }

  async updateTestLocation(lng: number, lat: number) {
    try {
      const response = await authenticatedFetch('http://localhost:5000/routes/active/location', {
        method: 'POST',
        body: JSON.stringify({
          lat,
          lng,
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        this.lastLocationUpdate = await response.json();
        
        // Get route progress
        const progressResponse = await authenticatedFetch('http://localhost:5000/routes/active/progress');
        if (progressResponse.ok) {
          this.routeProgress = await progressResponse.json();
        }

        this.error = null;
        this.lastUpdate = new Date();
        this.lastLocation = { latitude: lat, longitude: lng };
        return this.lastLocationUpdate;
      }
    } catch (error) {
      this.error = "Failed to update test location";
    }
  }
}

export const locationTracking = $state(new LocationTrackingStore()); 
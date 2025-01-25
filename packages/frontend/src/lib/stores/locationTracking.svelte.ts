import { authenticatedFetch } from '$lib/canisters';

export class LocationTrackingStore {
  isTracking = $state(false);
  error = $state<string | null>(null);
  lastUpdate = $state<Date | null>(null);
  lastLocation = $state<{ latitude: number; longitude: number } | null>(null);
  isTestMode = $state(false);
  
  private intervalId: NodeJS.Timeout | null = null;

  async updateLocation() {
    if (!("geolocation" in navigator)) {
      this.error = "Geolocation is not supported";
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await authenticatedFetch('http://localhost:5000/routes/active/location', {
            method: 'POST',
            body: JSON.stringify({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              timestamp: new Date().toISOString()
            })
          });
          
          if (response.ok) {
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
        this.error = null;
        this.lastUpdate = new Date();
        this.lastLocation = { latitude: lat, longitude: lng };
        return await response.json();
      }
    } catch (error) {
      this.error = "Failed to update test location";
    }
  }
}

export const locationTracking = $state(new LocationTrackingStore()); 
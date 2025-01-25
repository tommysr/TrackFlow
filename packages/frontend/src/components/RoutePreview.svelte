<script lang="ts">
  import { getContext, onDestroy } from 'svelte';
  import type { MapContext } from 'svelte-maplibre/dist/context';
  import { LngLatBounds, Marker as MapLibreMarker } from 'maplibre-gl';
  import Marker from './Marker.svelte';
  import { mount } from 'svelte';
  import type { SvelteComponent } from 'svelte';

  export type RouteSimulation = {
    shipments: Array<{
      pickupAddress: { latitude: number; longitude: number };
      deliveryAddress: { latitude: number; longitude: number };
    }>;
    stops: Array<{
      sequenceIndex: number;
      stopType: 'PICKUP' | 'DELIVERY';
      location: {
        lng: number;
        lat: number;
      };
      estimatedArrival: string;
      shipmentId: number;
    }>;
    totalDistance: number;
    totalFuelCost: number;
    estimatedTime: number;
    fullPath: {
      type: 'LineString';
      coordinates: [number, number][];
    };
    distanceMatrix?: {
      durations: number[][];
      distances: number[][];
    };
  };

  let { routePreview, onBack, onCreate }: { 
    routePreview: RouteSimulation, 
    onBack: () => void, 
    onCreate: () => Promise<void> 
  } = $props();

  let isCreating = $state(false);
  let error: string | null = $state(null);

  let store = getContext<MapContext>(Symbol.for('svelte-maplibre')).map;
  let map = $derived<maplibregl.Map | null>($store);
  let mapMarkers: MapLibreMarker[] = $state([]);

  // Watch for changes in routePreview and update map
  $effect(() => {
    cleanupMap(); // Clean up first
    if (routePreview && map) {
      createMapDisplay();
    }
  });

  function createMapDisplay() {
    if (!map) return;

    // Add route line
    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature' as const,
        properties: {},
        geometry: routePreview.fullPath,
      },
    });

    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
      },
      paint: {
        'line-color': '#0066FF',
        'line-width': 4,
        'line-opacity': 0.8,
      },
    });

    // Create markers
    routePreview.stops.forEach((stop, i) => {
      const el = document.createElement('div');
      const color = getStopColor(stop.stopType);

      mount(Marker, {
        target: el,
        props: {
          location: { lng: stop.location.lng, lat: stop.location.lat },
          name: String(stop.sequenceIndex + 1),
          onClick: () => {},
          active: true,
          color,
          type: getMarkerType(stop.stopType)
        }
      });

      // mapMarkers.push(marker);
    });

    // Fit bounds
    const bounds = new LngLatBounds();
    routePreview.fullPath.coordinates.forEach((coord) => bounds.extend(coord));
    map.fitBounds(bounds, { padding: 50 });
  }

  function cleanupMap() {
    // Remove all markers from the map
    const markers = document.querySelectorAll('.pin');
    markers.forEach(marker => marker.remove());
    
    // Clear route layer and source
    if (map) {
      if (map.getLayer('route')) map.removeLayer('route');
      if (map.getSource('route')) map.removeSource('route');
    }
  }

  async function handleCreate() {
    try {
      isCreating = true;
      error = null;
      await onCreate();
    } catch (e) {
      error = e instanceof Error ? e.message : 'An unknown error occurred';
    } finally {
      isCreating = false;
    }
  }

  function handleBack() {
    cleanupMap();
    onBack();
  }

  function getStopColor(stopType: string) {
    switch(stopType) {
      case 'PICKUP':
        return 'var(--primary-500)';
      case 'DELIVERY':
        return 'var(--secondary-500)';
      case 'START':
        return 'var(--accent-500)';
      case 'END':
        return 'var(--accent-200)';
      default:
        return 'var(--primary-200)';
    }
  }

  function getMarkerType(stopType: string): 'P' | 'D' | 'S' | 'E' {
    switch(stopType) {
      case 'PICKUP':
        return 'P';
      case 'DELIVERY':
        return 'D';
      case 'START':
        return 'S';
      case 'END':
        return 'E';
      default:
        return 'P';
    }
  }

  // Ensure cleanup on component destroy
  onDestroy(cleanupMap);
</script>

<div
  class="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 z-10 w-[600px]"
>
  <div class="flex flex-col space-y-4">
    <div class="text-center">
      <p class="text-lg font-semibold">Route Preview</p>
      <p class="text-sm text-gray-600">Review route details before creating</p>
    </div>

    <div class="grid grid-cols-3 gap-4 px-6 py-2 bg-gray-50 rounded-lg">
      <div class="text-center">
        <p class="text-sm text-gray-600">Total Distance</p>
        <p class="font-semibold">{routePreview.totalDistance.toFixed(2)} km</p>
      </div>
      <div class="text-center">
        <p class="text-sm text-gray-600">Estimated Time</p>
        <p class="font-semibold">
          {(routePreview.estimatedTime / 60).toFixed(2)} hours
        </p>
      </div>
      <div class="text-center">
        <p class="text-sm text-gray-600">Fuel Cost</p>
        <p class="font-semibold">${routePreview.totalFuelCost.toFixed(2)}</p>
      </div>
    </div>

    {#if error}
      <div class="text-red-500 text-center text-sm">{error}</div>
    {/if}

    <div class="flex justify-center space-x-4">
      <button
        type="button"
        onclick={handleBack}
        disabled={isCreating}
        class="bg-gray-500 rounded-full px-7 py-2 text-white text-base transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200 disabled:opacity-50"
      >
        Back
      </button>
      <button
        type="button"
        onclick={handleCreate}
        disabled={isCreating}
        class="bg-gradient-to-r from-blue-500 to-rose-400 rounded-full px-7 py-2 text-white text-base transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200 disabled:opacity-50 flex items-center space-x-2"
      >
        {#if isCreating}
          <span class="animate-spin">⌛</span>
        {/if}
        <span>Create Route</span>
      </button>
    </div>
  </div>
</div>


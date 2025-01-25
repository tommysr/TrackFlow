<script lang="ts">
  import type { Route, RouteStop } from '../routes/map/drivers/types';
  import { formatDistance, formatDateTime, formatDuration } from '$lib/format';
  import { getContext } from 'svelte';
  import type { MapContext } from 'svelte-maplibre/dist/context';
  import Marker from './Marker.svelte';
  import { LngLatBounds } from 'maplibre-gl';
  import { onDestroy } from 'svelte';
  import { authenticatedFetch } from '$lib/canisters';
  import { locationTracking } from '$src/lib/stores/locationTracking.svelte';
  
  let { route }: { route: Route } = $props();
  let isTestMode = $state(false);
  
  function getStopColor(stopType: string): string {
    switch(stopType) {
      case 'START':
        return 'var(--accent-500)';
      case 'END':
        return 'var(--accent-500)';
      case 'PICKUP':
        return 'var(--primary-500)';
      case 'DELIVERY':
        return 'var(--secondary-500)';
      default:
        return 'var(--primary-200)';
    }
  }

  function getMarkerType(stopType: string): 'S' | 'E' | 'P' | 'D'  {
    switch(stopType) {
      case 'START':
        return 'S';
      case 'END':
        return 'E';
      case 'PICKUP':
        return 'P';
      case 'DELIVERY':
        return 'D';
      default:
        return 'S';
    }
  }
  // Filter out START/END points and sort by sequence
  let shipmentStops = $derived.by(() => {
    return route.stops?.filter(stop => 
      stop.stopType === 'PICKUP' || stop.stopType === 'DELIVERY'
    ).sort((a, b) => a.sequenceIndex - b.sequenceIndex) || [];
  });

  let currentStop = $derived.by(() => {
    return shipmentStops.find(stop => !stop.actualArrival);
  });

  let remainingStops = $derived.by(() => {
    const currentIndex = currentStop?.sequenceIndex || 0;
    return shipmentStops.filter(s => s.sequenceIndex > currentIndex);
  });

  // Start tracking if not already tracking
  $effect(() => {
    if (!locationTracking.isTracking) {
      locationTracking.startTracking();
    }
  });

  // Map handling
  let store = getContext<MapContext>(Symbol.for('svelte-maplibre')).map;
  let map = $derived<maplibregl.Map | null>($store);

  // Handle map clicks in test mode
  $effect(() => {
    if (!map) return;

    const handleMapClick = async (e: any) => {
      if (!isTestMode) return;
      
      try {
        const response = await locationTracking.updateTestLocation(e.lngLat.lng, e.lngLat.lat);
        
        if (response.ok) {
          const { updatedRoute } = await response.json();
          route = updatedRoute;
        }
      } catch (error) {
        console.error('Failed to update test location:', error);
      }
    };

    map.on('click', handleMapClick);
    return () => map.off('click', handleMapClick);
  });

  $effect(() => {
    if (map && route) {
      // Clear previous route
      if (map.getLayer('active-route')) map.removeLayer('active-route');
      if (map.getSource('active-route')) map.removeSource('active-route');

      // Add route line
      map.addSource('active-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: route.fullPath,
        },
      });

      map.addLayer({
        id: 'active-route',
        type: 'line',
        source: 'active-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#22c55e', // Green color for active route
          'line-width': 4,
          'line-opacity': 0.8,
        },
      });

      // Fit bounds to show entire route
      const bounds = new LngLatBounds();
      route.fullPath.coordinates.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, { padding: 50 });
    }

    return () => {
      if (map) {
        if (map.getLayer('active-route')) map.removeLayer('active-route');
        if (map.getSource('active-route')) map.removeSource('active-route');
      }
    };
  });

  // When location updates, fit map bounds to include current location
  $effect(() => {
    if (locationTracking.lastLocation && map) {
      const bounds = new LngLatBounds();
      
      // Add current location to bounds
      bounds.extend([
        locationTracking.lastLocation.longitude,
        locationTracking.lastLocation.latitude
      ]);
      
      // Add all stops to bounds
      route.stops?.forEach(stop => {
        bounds.extend(stop.location.coordinates);
      });

      map.fitBounds(bounds, { padding: 50 });
    }
  });

  onDestroy(() => {
    if (map) {
      if (map.getLayer('active-route')) map.removeLayer('active-route');
      if (map.getSource('active-route')) map.removeSource('active-route');
    }
  });
</script>

<div class="border rounded-lg p-4 bg-white shadow-sm">
  <div class="mb-4">
    <div class="flex justify-between items-center">
      <h3 class="font-semibold text-lg">Active Route #{route.id.slice(0,8)}</h3>
      <button
        class={`px-2 py-1 rounded text-sm ${isTestMode ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'}`}
        onclick={() => isTestMode = !isTestMode}
      >
        {isTestMode ? '🎮 Test Mode' : '📍 GPS Mode'}
      </button>
    </div>
    
    {#if isTestMode}
      <div class="text-sm text-yellow-600 mt-2 bg-yellow-50 p-2 rounded">
        Click anywhere on the map to simulate carrier movement
      </div>
    {/if}

    <div class="text-sm text-gray-600 space-y-1">
      <div>Started: {route.startedAt ? formatDateTime(route.startedAt) : 'N/A'}</div>
      <div class="flex items-center gap-2">
        <span>Progress: {route.metrics?.progress?.completedStops || 0}/{shipmentStops.length} stops</span>
        {#if locationTracking.isTracking}
          <span class="text-xs text-blue-500">
            {locationTracking.lastUpdate 
              ? `Last update: ${formatDateTime(locationTracking.lastUpdate.toISOString())}` 
              : 'Updating location...'}
          </span>
        {:else}
          <span class="text-xs text-yellow-500">Location tracking disabled</span>
        {/if}
      </div>
      {#if route.metrics?.progress?.remainingDistance}
        <div>Remaining distance: {formatDistance(route.metrics.progress.remainingDistance)}</div>
      {/if}
      {#if route.metrics?.progress?.isDelayed}
        <div class="text-red-500">Route is delayed</div>
      {/if}
    </div>
  </div>

  {#if currentStop}
    <div class="bg-blue-50 p-3 rounded-lg mb-4">
      <div class="font-medium mb-2">Current Stop</div>
      <div class="text-sm">
        <div class="flex items-center gap-2">
          <span class="font-medium">{currentStop.stopType}</span>
          {#if currentStop.shipmentId}
            <span class="text-gray-500">Shipment #{currentStop.shipmentId}</span>
          {/if}
        </div>
        <div>ETA: {formatDateTime(currentStop.estimatedArrival)}</div>
        {#if route.metrics?.progress?.remainingDistance}
          <div>Distance: {formatDistance(route.metrics.progress.remainingDistance)}</div>
        {/if}
      </div>
    </div>
  {/if}

  {#if remainingStops.length > 0}
    <div>
      <div class="font-medium mb-2">Next Stops</div>
      <div class="space-y-2">
        {#each remainingStops as stop}
          <div class="bg-gray-50 p-2 rounded text-sm">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-medium">Stop #{stop.sequenceIndex + 1}</span>
                <span class={stop.stopType === 'PICKUP' ? 'text-blue-600' : 'text-green-600'}>
                  {stop.stopType}
                </span>
              </div>
              {#if stop.shipmentId}
                <span class="text-gray-500">Shipment #{stop.shipmentId}</span>
              {/if}
            </div>
            <div class="text-gray-600">ETA: {formatDateTime(stop.estimatedArrival)}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if locationTracking.error}
    <div class="bg-red-100 text-red-700 p-2 rounded mt-2 text-sm">
      {locationTracking.error}
    </div>
  {/if}
</div>

{#if map}
  {#each route.stops || [] as stop}
    <Marker
      location={{ 
        lng: stop.location.coordinates[0], 
        lat: stop.location.coordinates[1] 
      }}
      name={stop.stopType === 'START' || stop.stopType === 'END' 
        ? stop.stopType[0] 
        : String(shipmentStops.findIndex(s => s.id === stop.id) + 1)}
      onClick={() => {}}
      active={!stop.actualArrival}
      color={getStopColor(stop.stopType)}
      type={getMarkerType(stop.stopType)}
    />
  {/each}

  <!-- Current location marker -->
  {#if locationTracking.lastLocation}
    <Marker
      location={{
        lng: locationTracking.lastLocation.longitude,
        lat: locationTracking.lastLocation.latitude
      }}
      name="🚚"
      onClick={() => {}}
      active={true}
      color="var(--accent-900)"
      type="C"
    />
  {/if}
{/if}

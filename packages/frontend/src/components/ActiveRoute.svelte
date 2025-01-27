<script lang="ts">
  import {
    type Route,
    type RouteStop,
    type MarkerType,
    RouteStatus,
  } from '$lib/types/route.types';
  import { formatDistance, formatDateTime, formatDuration } from '$lib/format';
  import { getContext } from 'svelte';
  import type { MapContext } from 'svelte-maplibre/dist/context';
  import Marker from './Marker.svelte';
  import { LngLatBounds } from 'maplibre-gl';
  import { onDestroy } from 'svelte';
  import { authenticatedFetch } from '$lib/canisters';
  import { locationTracking } from '$lib/stores/locationTracking.svelte';
  import DeliveryConfirmation from './DeliveryConfirmation.svelte';

  let { route }: { route: Route } = $props();
  let isTestMode = $state(false);
  let confirmingDelivery = $state<RouteStop | null>(null);

  function getStopColor(stopType: string, isDelayed: boolean = false): string {
    if (isDelayed) return 'var(--accent-700)';
    switch (stopType) {
      case 'PICKUP':
        return 'var(--primary-500)';
      case 'DELIVERY':
        return 'var(--secondary-500)';
      case 'START':
        return 'var(--accent-500)';
      case 'END':
        return 'var(--accent-500)';
      default:
        return 'var(--primary-200)';
    }
  }

  function getMarkerType(stopType: string): MarkerType {
    switch (stopType) {
      case 'PICKUP':
        return 'P';
      case 'DELIVERY':
        return 'D';
      case 'START':
        return 'S';
      case 'END':
        return 'E';
      default:
        return 'S';
    }
  }

  // Filter out START/END points and sort by sequence for the list view
  let shipmentStops = $derived.by(() => {
    return (
      route.stops
        ?.filter(
          (stop) => stop.stopType === 'PICKUP' || stop.stopType === 'DELIVERY',
        )
        .sort((a, b) => a.sequenceIndex - b.sequenceIndex) || []
    );
  });

  let currentStop = $derived.by(() => {
    return shipmentStops.find((stop) => !stop.actualArrival);
  });

  let remainingStops = $derived.by(() => {
    const currentIndex = currentStop?.sequenceIndex || 0;
    return shipmentStops.filter((s) => s.sequenceIndex > currentIndex);
  });

  // Calculate minutes until ETA for a stop
  function getETAMinutes(estimatedArrival: string): number {
    console.log('estimatedArrival', estimatedArrival);
    const eta = new Date(estimatedArrival);
    const now = new Date();
    console.log('eta', eta);
    console.log('now', now);
    console.log('eta.getTime()', eta.getTime());
    console.log('now.getTime()', now.getTime());
    console.log('eta.getTime() - now.getTime()', eta.getTime() - now.getTime());
    console.log(
      '(eta.getTime() - now.getTime()) / (1000 * 60)',
      (eta.getTime() - now.getTime()) / (1000 * 60),
    );
    return Math.round((eta.getTime() - now.getTime()) / (1000 * 60));
  }

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
        const locationUpdate = await locationTracking.updateTestLocation(
          e.lngLat.lng,
          e.lngLat.lat,
        );
        if (locationUpdate) {
          route = locationUpdate.updatedRoute;
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
          'line-color': '#22c55e',
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
        locationTracking.lastLocation.latitude,
      ]);

      // Add all stops to bounds
      route.stops?.forEach((stop) => {
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

  $effect(() => {
    if (locationTracking.lastLocationUpdate) {
      route = locationTracking.lastLocationUpdate.updatedRoute;
    }
  });

  async function handleDeliveryConfirmed() {
    confirmingDelivery = null;

    try {
      const response = await authenticatedFetch(
        'http://localhost:5000/routes/active',
      );
      if (response.ok) {
        route = await response.json();
      } else if (response.status === 404) {
        // TODO: need to change authenticatedFetch to not throw an error
        // // Route is completed, show success message
        // route.status = RouteStatus.COMPLETED;
        // locationTracking.stopTracking();
      }
    } catch (error: any) {
      if (typeof error === 'string' && error == 'No active route found') {
        route.status = RouteStatus.COMPLETED;
        locationTracking.stopTracking();
        console.error('Failed to update route:', error);
      }
    }
  }

  // Get updated ETA for a stop if available
  function getUpdatedETA(stopId: string): Date | null {
    const updatedStop = locationTracking.updatedStopsWithNewETAs.find(
      (s) => s.id === stopId,
    );
    return updatedStop?.estimatedArrival
      ? new Date(updatedStop.estimatedArrival)
      : null;
  }

  // Get segment info for a stop
  function getSegmentInfo(
    stopId: string,
  ): { distance: number; duration: number } | null {
    const segment = locationTracking.updatedSegments.find(
      (s) => s.fromStopId === stopId,
    );
    return segment
      ? { distance: segment.distance, duration: segment.duration }
      : null;
  }
</script>

<div class="border rounded-lg p-4 bg-white shadow-sm space-y-4">
  <!-- Header with Route Info -->
  <div>
    <div class="flex justify-between items-center mb-2">
      <h3 class="font-semibold text-lg">
        Active Route #{route.id.slice(0, 8)}
        {#if route.status === RouteStatus.COMPLETED}
          <span class="ml-2 text-sm text-green-600">✓ Completed</span>
        {/if}
      </h3>
      {#if route.status !== RouteStatus.COMPLETED}
        <button
          class={`px-2 py-1 rounded text-sm ${isTestMode ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'}`}
          onclick={() => (isTestMode = !isTestMode)}
        >
          {isTestMode ? '🎮 Test Mode' : '📍 GPS Mode'}
        </button>
      {/if}
    </div>

    {#if isTestMode}
      <div class="text-sm text-yellow-600 mt-2 bg-yellow-50 p-2 rounded">
        Click anywhere on the map to simulate carrier movement
      </div>
    {/if}

    <!-- Route Timing Information -->
    <div class="text-sm text-gray-600 space-y-1 mt-2">
      <div>
        Activated: {route.startedAt ? formatDateTime(route.startedAt) : 'N/A'}
      </div>
      {#if route.lastLocationUpdate}
        <div>Last Update: {formatDateTime(route.lastLocationUpdate)}</div>
      {/if}
      <div class="flex items-center gap-2">
        <span
          >Progress: {route.metrics?.completedStops || 0}/{shipmentStops.length}
          stops</span
        >
        {#if locationTracking.isTracking}
          <span class="text-xs text-blue-500">
            {locationTracking.lastUpdate
              ? `GPS Update: ${formatDateTime(locationTracking.lastUpdate.toISOString())}`
              : 'Updating location...'}
          </span>
        {:else}
          <span class="text-xs text-yellow-500">Location tracking disabled</span
          >
        {/if}
      </div>
      {#if route.metrics?.remainingDistance}
        <div>
          Remaining distance: {formatDistance(route.metrics.remainingDistance)}
        </div>
      {/if}
      {#if locationTracking.routeProgress?.isDelayed}
        <div class="text-red-500">
          Route is delayed by {locationTracking.routeProgress.delayMinutes} minutes
        </div>
      {/if}
    </div>
  </div>

  <!-- Current Stop -->
  {#if currentStop}
    {@const segmentInfo = getSegmentInfo(currentStop.id)}
    <div class="bg-blue-50 p-3 rounded-lg">
      <div class="font-medium mb-2">Current Stop</div>
      <div class="text-sm space-y-1">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-medium">{currentStop.stopType}</span>
            {#if currentStop.shipment?.canisterShipmentId}
              <span class="text-gray-500"
                >Shipment #{currentStop.shipment?.canisterShipmentId}</span
              >
            {/if}
          </div>

          {#if currentStop.stopType === 'DELIVERY' && !currentStop.actualArrival}
            <button
              class="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
              onclick={() => (confirmingDelivery = currentStop)}
            >
              Confirm Delivery
            </button>
          {/if}
        </div>
        {#if currentStop.estimatedArrival}
          {@const updatedETA = getUpdatedETA(currentStop.id)}
          <div class="flex items-center gap-2">
            <span
              >ETA: {getETAMinutes(
                formatDateTime(
                  updatedETA
                    ? updatedETA.toISOString()
                    : currentStop.estimatedArrival,
                ),
              )} min</span
            >
            {#if updatedETA && updatedETA > new Date(currentStop.estimatedArrival)}
              <span class="text-red-500">
                (Delayed by {Math.round(
                  (updatedETA.getTime() -
                    new Date(currentStop.estimatedArrival).getTime()) /
                    (1000 * 60),
                )} min)
              </span>
            {/if}
          </div>
        {/if}

        {#if segmentInfo}
          <div class="mt-1 text-gray-600">
            <div>
              Distance to next stop: {formatDistance(segmentInfo.distance)}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Remaining Stops -->
  {#if remainingStops.length > 0}
    <div>
      <div class="font-medium mb-2">Next Stops</div>
      <div class="space-y-2">
        {#each remainingStops as stop}
          {@const segmentInfo = getSegmentInfo(stop.id)}

          <div class="bg-gray-50 p-3 rounded text-sm">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="font-medium">Stop #{stop.sequenceIndex + 1}</span>
                <span
                  class={stop.stopType === 'PICKUP'
                    ? 'text-blue-600'
                    : 'text-green-600'}
                >
                  {stop.stopType}
                </span>
              </div>
              {#if stop.shipment?.canisterShipmentId}
                <span class="text-gray-500">
                  Shipment #{stop.shipment?.canisterShipmentId}
                </span>
              {/if}
            </div>
            {#if stop.estimatedArrival}
              {@const updatedETA = getUpdatedETA(stop.id)}
              <div class="flex items-center gap-2 mt-1">
                <span
                  >ETA: {getETAMinutes(
                    formatDateTime(
                      updatedETA
                        ? updatedETA.toISOString()
                        : stop.estimatedArrival,
                    ),
                  )} min</span
                >
                {#if updatedETA && updatedETA > new Date(stop.estimatedArrival)}
                  <span class="text-red-500">
                    (Delayed by {Math.round(
                      (updatedETA.getTime() -
                        new Date(stop.estimatedArrival).getTime()) /
                        (1000 * 60),
                    )} min)
                  </span>
                {/if}
              </div>
            {/if}

            {#if segmentInfo}
              <div class="mt-1 text-gray-600">
                <div>
                  Distance to next stop: {formatDistance(segmentInfo.distance)}
                </div>
                <div>
                  Estimated driving time: {formatDuration(segmentInfo.duration)}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if locationTracking.error}
    <div class="bg-red-100 text-red-700 p-2 rounded mt-4 text-sm">
      {locationTracking.error}
    </div>
  {/if}
</div>

<!-- Map Markers -->
{#if map}
  <!-- All route stops including START/END -->
  {#each route.stops || [] as stop}
    <Marker
      location={{
        lng: stop.location.coordinates[0],
        lat: stop.location.coordinates[1],
      }}
      name={stop.stopType === 'START' || stop.stopType === 'END'
        ? stop.stopType[0]
        : String(shipmentStops.findIndex((s) => s.id === stop.id) + 1)}
      onClick={() => {}}
      active={!stop.actualArrival}
      color={getStopColor(
        stop.stopType,
        locationTracking.routeProgress?.isDelayed,
      )}
      type={getMarkerType(stop.stopType)}
    />
  {/each}

  <!-- Current location marker - show either from tracking or route's last location -->
  {#if locationTracking.lastLocation}
    <Marker
      location={{
        lng: locationTracking.lastLocation.longitude,
        lat: locationTracking.lastLocation.latitude,
      }}
      name="🚚"
      onClick={() => {}}
      active={true}
      color="var(--accent-900)"
      type="C"
    />
  {:else if route.lastLocation}
    <Marker
      location={{
        lng: route.lastLocation.coordinates[0],
        lat: route.lastLocation.coordinates[1],
      }}
      name="🚚"
      onClick={() => {}}
      active={true}
      color="var(--accent-900)"
      type="C"
    />
  {/if}
{/if}

{#if route.status === RouteStatus.COMPLETED}
  <div class="mt-4 bg-green-50 p-4 rounded-lg text-green-800">
    <h3 class="font-semibold mb-2">Route Completed</h3>
    <p class="text-sm">All deliveries have been completed successfully.</p>
    {#if route.completedAt}
      <p class="text-sm mt-1">
        Completed at: {formatDateTime(route.completedAt)}
      </p>
    {/if}
  </div>
{/if}

<!-- Add the confirmation dialog -->
{#if confirmingDelivery}
  <DeliveryConfirmation
    stop={confirmingDelivery}
    onClose={() => (confirmingDelivery = null)}
    onConfirmed={handleDeliveryConfirmed}
  />
{/if}

<script lang="ts">
  import { MapLibre } from 'svelte-maplibre';
  import type { MapContext } from 'svelte-maplibre/dist/context';
  import Marker from '$components/Marker.svelte';
  import type { PageData } from './$types';
  import { formatDateTime } from '$lib/format';
  import { formatDate } from 'date-fns';
  import type { Feature } from 'geojson';
  import { getContext } from 'svelte';
  import { LngLatBounds } from 'maplibre-gl';

  let { data }: { data: PageData } = $props();
  let { shipment } = data;

  let error = $state<string | null>(null);

  // Get map context
  let store = getContext<MapContext>(Symbol.for('svelte-maplibre')).map;
  let map = $derived<maplibregl.Map | null>($store);

  // Create GeoJSON for route segment
  let routeGeoJSON = $state<Feature | undefined>(
    shipment?.activeSegment
      ? {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: shipment.activeSegment.points.map((point) => [
              point.lng,
              point.lat,
            ]),
          },
        }
      : undefined,
  );

  $effect(() => {
    if (shipment?.activeSegment) {
      routeGeoJSON = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: shipment.activeSegment.points.map((point) => [
            point.lng,
            point.lat,
          ]),
        },
      };
    } else {
      routeGeoJSON = undefined;
    }
  });

  // Add route line to map and fit bounds
  $effect(() => {
    if (map && routeGeoJSON && shipment) {
      // Clear previous route
      if (map.getLayer('route')) map.removeLayer('route');
      if (map.getSource('route')) map.removeSource('route');

      // Add route line
      map.addSource('route', {
        type: 'geojson',
        data: routeGeoJSON,
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
          'line-color': '#22c55e',
          'line-width': 3,
          'line-opacity': 0.8,
        },
      });

      // Fit bounds to include route and markers
      const bounds = new LngLatBounds();

      if (routeGeoJSON.geometry.type === 'LineString') {
        // Add route coordinates to bounds
        routeGeoJSON.geometry.coordinates.forEach((coord) => {
          bounds.extend(coord as [number, number]);
        });
      }

      // Add markers to bounds
      if (shipment.pickup) {
        bounds.extend([shipment.pickup.lng, shipment.pickup.lat]);
      }
      if (shipment.delivery) {
        bounds.extend([shipment.delivery.lng, shipment.delivery.lat]);
      }
      if (shipment.currentLocation) {
        bounds.extend([shipment.currentLocation.lng, shipment.currentLocation.lat]);
      }

      // Fit the map to the bounds with padding
      map.fitBounds(bounds, { padding: 100 });
    }

    return () => {
      if (map) {
        if (map.getLayer('route')) map.removeLayer('route');
        if (map.getSource('route')) map.removeSource('route');
      }
    };
  });

  $inspect(shipment?.activeSegment);
</script>

<svelte:head>
  <title>Shipment Tracking</title>
  <meta name="description" content="Track your shipment" />
</svelte:head>

<div
  class="fixed left-1/2 -translate-x-1/2 bottom-10 w-96 bg-white rounded-lg shadow-lg p-6 overflow-y-auto z-10"
>
  <h1
    class="text-2xl font-semibold mb-6 bg-gradient-to-r from-blue-500 to-rose-400 bg-clip-text text-transparent"
  >
    Shipment Tracking
  </h1>

  {#if error}
    <div class="bg-red-50 text-red-500 p-4 rounded-lg mb-4">
      {error}
    </div>
  {/if}

  {#if shipment}
    <div class="space-y-6">
      <div class="grid grid-cols-1 gap-4">
        <div>
          <span class="text-sm text-gray-500">{shipment.isPickupPhase ? 'Pickup' : 'Delivery'} Address</span>
          <p class="font-medium">
            {shipment.isPickupPhase && shipment.pickup
              ? `${shipment.pickup.address.street}, ${shipment.pickup.address.city}`
              : !shipment.isPickupPhase && shipment.delivery
                ? `${shipment.delivery.address.street}, ${shipment.delivery.address.city}`
                : 'address information not yet available'}
          </p>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex justify-between">
          <span class="text-sm text-gray-500">Status</span>
          <span class="font-medium">{shipment.status}</span>
        </div>

        {#if shipment.estimatedPickupDate}
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Estimated Pickup</span>
            <span class="font-medium"
              >{shipment.estimatedPickupDate
                ? formatDateTime(shipment.estimatedPickupDate)
                : 'Not available'}</span
            >
          </div>
        {/if}

        {#if shipment.estimatedDeliveryDate}
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Estimated Delivery</span>
            <span class="font-medium"
              >{shipment.estimatedDeliveryDate
                ? formatDateTime(shipment.estimatedDeliveryDate)
                : 'Not available'}</span
            >
          </div>
        {/if}

        {#if shipment.lastUpdate}
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Last Update</span>
            <span class="font-medium"
              >{shipment.lastUpdate
                ? formatDateTime(shipment.lastUpdate)
                : 'Not available'}</span
            >
          </div>
        {/if}

        {#if shipment.currentLocation}
          <div class="flex justify-between">
            <span class="text-sm text-gray-500">Current Location</span>
            <span class="font-medium">
              {shipment.currentLocation.lat.toFixed(4)}, {shipment.currentLocation.lng.toFixed(
                4,
              )}
            </span>
          </div>
        {/if}

      </div>
    </div>
  {:else}
    <div class="text-center text-gray-500">
      No tracking information available
    </div>
  {/if}
</div>

{#if shipment}
  {#if shipment.pickup}
    <Marker
      location={{ lat: shipment.pickup.lat, lng: shipment.pickup.lng }}
      name="P"
      type="P"
    />
  {/if}

  {#if shipment.delivery}
    <Marker
      location={{ lat: shipment.delivery.lat, lng: shipment.delivery.lng }}
      name="D"
      type="D"
    />
  {/if}

  {#if shipment.currentLocation}
    <Marker
      location={{
        lat: shipment.currentLocation.lat,
        lng: shipment.currentLocation.lng,
      }}
      name="C"
      type="C"
      color="var(--primary-500)"
    />
  {/if}
{/if}

<MapLibre 
  style="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
  class="maplibre relative w-full sm:aspect-video h-screen z-0"
  zoom={5}
/>


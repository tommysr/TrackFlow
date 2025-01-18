<script lang="ts">
  import { getContext } from 'svelte';

  export type RoutePreview = {
    shipments: Array<{
      pickupAddress: { latitude: number; longitude: number };
      deliveryAddress: { latitude: number; longitude: number };
    }>;
    totalDistance: number;
    totalFuelCost: number;
    estimatedTime: number;
    geometry: {
      coordinates: [number, number][];
      type: string;
    };
  };

  let { routePreview, onBack, onCreate }: { routePreview: RoutePreview, onBack: () => void, onCreate: () => void } = $props();

  let store = getContext<MapContext>(Symbol.for('svelte-maplibre')).map;
  let map = $derived<maplibregl.Map | null>($store);

  // Watch for changes in routePreview and update map
  $effect(() => {
    if (routePreview && map) {
      updateMapDisplay();
    }
  });

  function updateMapDisplay() {
    if (!map) return;
    // Remove existing layers if they exist
    if (map.getLayer('route')) map.removeLayer('route');
    if (map.getLayer('route-points')) map.removeLayer('route-points');
    if (map.getSource('route')) map.removeSource('route');
    if (map.getSource('route-points')) map.removeSource('route-points');

    // Add route line
    map.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: routePreview.geometry,
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

    // Add points
    const points = routePreview.shipments.flatMap((shipment) => [
      {
        type: 'Feature',
        properties: { type: 'pickup' },
        geometry: {
          type: 'Point',
          coordinates: [
            shipment.pickupAddress.longitude,
            shipment.pickupAddress.latitude,
          ],
        },
      },
      {
        type: 'Feature',
        properties: { type: 'delivery' },
        geometry: {
          type: 'Point',
          coordinates: [
            shipment.deliveryAddress.longitude,
            shipment.deliveryAddress.latitude,
          ],
        },
      },
    ]);

    map.addSource('route-points', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: points,
      },
    });

    map.addLayer({
      id: 'route-points',
      type: 'circle',
      source: 'route-points',
      paint: {
        'circle-radius': 8,
        'circle-color': [
          'match',
          ['get', 'type'],
          'pickup',
          '#00ff00',
          'delivery',
          '#ff0000',
          '#000000',
        ],
      },
    });

    // Fit map to show all points and route
    const bounds = new LngLatBounds();
    routePreview.geometry.coordinates.forEach((coord) => bounds.extend(coord));
    map.fitBounds(bounds, { padding: 50 });
  }

  function handleBack() {
    // Clear route from map
    if (map) {
      if (map.getLayer('route')) map.removeLayer('route');
      if (map.getLayer('route-points')) map.removeLayer('route-points');
      if (map.getSource('route')) map.removeSource('route');
      if (map.getSource('route-points')) map.removeSource('route-points');
    }
    onBack();
  }
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

    <div class="flex justify-center space-x-4">
      <button
        type="button"
        onclick={handleBack}
        class="bg-gray-500 rounded-full px-7 py-2 text-white text-base transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
      >
        Back
      </button>
      <button
        type="button"
        onclick={onCreate}
        class="bg-gradient-to-r from-blue-500 to-rose-400 rounded-full px-7 py-2 text-white text-base transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
      >
        Create Route
      </button>
    </div>
  </div>
</div>

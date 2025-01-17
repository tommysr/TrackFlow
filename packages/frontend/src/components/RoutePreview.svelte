<script lang="ts">
  import { onMount } from 'svelte';
  import maplibre, { type GeoJSONSource } from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import type { RouteOptimizationResult, Location } from '../../../backend/src/routes/route-optimization.service';

  export let routePreview: {
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

  let map: maplibre.Map;
  let mapElement: HTMLElement;

  onMount(() => {
    // Initialize map
    map = new maplibre.Map({
      container: mapElement,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', // Replace with your map style URL
      center: [21.017532, 52.237049], // Note: MapLibre uses [lng, lat] order
      zoom: 6
    });

    map.on('load', () => {
      if (routePreview) {
        displayRoute();
      }
    });

    return () => {
      map.remove();
    };
  });

  function displayRoute() {
    if (!map || !routePreview) return;

    console.log('Route geometry:', routePreview.geometry);

    // Remove existing layers if they exist
    if (map.getLayer('route')) map.removeLayer('route');
    if (map.getLayer('points')) map.removeLayer('points');
    if (map.getSource('route')) map.removeSource('route');
    if (map.getSource('points')) map.removeSource('points');

    // Create GeoJSON for the route
    const routeGeoJSON = {
      type: 'Feature',
      properties: {},
      geometry: routePreview.geometry
    };

    // Add route line
    map.addSource('route', {
      type: 'geojson',
      data: routeGeoJSON
    });

    map.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#0066FF',
        'line-width': 4,
        'line-opacity': 0.8
      }
    });

    // Create points for pickup and delivery locations
    const points = routePreview.shipments.flatMap(shipment => ([
      {
        type: 'Feature',
        properties: { type: 'pickup' },
        geometry: {
          type: 'Point',
          coordinates: [shipment.pickupAddress.longitude, shipment.pickupAddress.latitude]
        }
      },
      {
        type: 'Feature',
        properties: { type: 'delivery' },
        geometry: {
          type: 'Point',
          coordinates: [shipment.deliveryAddress.longitude, shipment.deliveryAddress.latitude]
        }
      }
    ]));

    // Add points to map
    map.addSource('points', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: points
      }
    });

    // Add point markers
    map.addLayer({
      id: 'points',
      type: 'circle',
      source: 'points',
      paint: {
        'circle-radius': 8,
        'circle-color': [
          'match',
          ['get', 'type'],
          'pickup', '#00ff00',
          'delivery', '#ff0000',
          '#000000'
        ]
      }
    });

    // Fit map to show all points and route
    const bounds = new maplibre.LngLatBounds();

    // Add route coordinates to bounds
    if (routePreview.geometry?.coordinates) {
      routePreview.geometry.coordinates.forEach((coord) => {
        bounds.extend(coord);
      });
    }

    // Add shipment points to bounds
    routePreview.shipments.forEach((shipment) => {
      bounds.extend([shipment.pickupAddress.longitude, shipment.pickupAddress.latitude]);
      bounds.extend([shipment.deliveryAddress.longitude, shipment.deliveryAddress.latitude]);
    });

    // Only fit bounds if we have points
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 50 });
    }
  }

  $: if (map?.loaded() && routePreview?.geometry) {
    console.log('Updating route display');
    displayRoute();
  }
</script>

<div bind:this={mapElement} class="w-full h-[400px] rounded-lg shadow-lg" />

<style>
  @import 'maplibre-gl/dist/maplibre-gl.css';
</style> 
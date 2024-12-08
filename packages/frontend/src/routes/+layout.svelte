<script lang="ts">
  import Navigation from '$components/Navigation.svelte';
  import '../index.scss';

  import type { Snippet } from 'svelte';
  import { MapLibre } from 'svelte-maplibre';

  const { children } = $props<{
    children: Snippet;
  }>();

  const defaultLocation: [number, number] = [22, 52];
</script>

<Navigation />

<MapLibre
		style="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
		class="maplibre relative w-full sm:aspect-video h-screen z-0"
		zoom={5}
		center={defaultLocation}
	>
  {@render children()}
</MapLibre>
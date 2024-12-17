<script lang="ts">
	import { Marker } from 'svelte-maplibre';
	import { type Coords } from '../lib/common';

	let {
		location,
		onClick
	}: {
		name: string;
		location: Coords;
		onClick: () => void;
	} = $props();
</script>

<Marker bind:lngLat={location} on:click={onClick}>
	<div class="pin active bounce-a"></div>
</Marker>
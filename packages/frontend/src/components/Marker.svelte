<script lang="ts">
	import { Marker } from 'svelte-maplibre';
	import { type Coords } from '../lib/common';

	let {
		location,
		onClick = () => {},
		name = '',
	}: {
		location: Coords;
		onClick: () => void;
		name: string | undefined;
	} = $props();
</script>

<Marker bind:lngLat={location} on:click={onClick}>
	<div class="pin active bounce-a">{name}</div>
</Marker>

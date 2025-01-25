<script lang="ts">
  import { Marker } from 'svelte-maplibre';
  import { type Coords } from '../lib/common';
  import clsx from 'clsx';

  let {
    location,
    onClick = () => {},
    name = '',
    active = false,
    color = undefined,
    type = undefined,
    offset = [0, 0],
  }: {
    location: Coords;

    name: string | undefined;
    active?: boolean;
    color?: string;
    onClick?: () => void;
    type?: 'P' | 'D' | 'S' | 'E' | 'C';
    offset?: [number, number];
  } = $props();

  let style = $derived(`
		background: ${color || '#888888'};
	`);
  let displayText = $derived(`${name}${type ? `-${type}` : ''}`);
  let markerClass = $derived(
    clsx(
      'pin',
      active && 'active',
      type === 'P' && 'pickup',
      type === 'D' && 'delivery',
      type === 'S' && 'start',
      type === 'E' && 'end',
      type === 'C' && 'carrier',
    ),
  );

  $inspect(offset);
</script>

<Marker bind:lngLat={location} on:click={onClick} {offset}>
  <div class="marker-wrapper">
    <div class={markerClass} {style}>
      <span class="text">{displayText}</span>
    </div>
  </div>
</Marker>


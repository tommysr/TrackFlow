<script lang="ts">
  import Marker from './Marker.svelte';
  
  export let location: { lng: number; lat: number };
</script>

<Marker
  location={location}
  name="🚚"
  onClick={() => {}}
  active={true}
  color="var(--blue-500)"
  type="E"
/>

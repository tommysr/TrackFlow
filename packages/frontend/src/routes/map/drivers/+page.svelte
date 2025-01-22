<script lang="ts">
  import ListWrapper from '$components/ListWrapper.svelte';
  import ShipmentCard from '$components/ShipmentCard.svelte';
  import clsx from 'clsx';
  import { authenticatedFetch } from '$src/lib/canisters';
  import type { PageData } from './$types';
  import {
    RouteOperationType,
    type BoughtShipment,
    type ShipmentRouteOperation,
  } from '$src/lib/extended.shipment';
  import RoutePreview from '$components/RoutePreview.svelte';
  import Marker from '$components/Marker.svelte';
  import type { MapContext } from 'svelte-maplibre/dist/context';
  import { getContext } from 'svelte';

  let { data }: { data: PageData } = $props();

  let isMobileOpen = $state(false);
  let isWalletConnected = $state(true);
  let selectedNav = $state(0);
  let selectedShipments = $state<Set<number>>(new Set());
  let isCreatingRoute = $state(false);
  let routePreview = $state(null);

  const categories: {
    name: string;
    data: BoughtShipment[];
    type: 'available' | 'active' | 'statistics';
  }[] = [
    {
      name: 'Available',
      data: data.boughtShipments, // Will contain shipments with BOUGHT_WITH_ADDRESS or BOUGHT_NO_ADDRESS status
      type: 'available',
    },
    {
      name: 'Active Routes',
      data: [], // Will contain shipments in active routes
      type: 'active',
    },
    { name: 'Statistics', data: [], type: 'statistics' },
  ];

  let store = getContext<MapContext>(Symbol.for('svelte-maplibre')).map;
  let map = $derived<maplibregl.Map | null>($store);
  let currentZoom = $state(map?.getZoom() || 0);


 const handleZoom = () => {
  if (map) {
      currentZoom = Math.round(map.getZoom());
    }
  };

  // Add zoom change handler
  $effect(() => {
    if (map) {
      map.on('zoomend', handleZoom);
      return () => {
        map.off('zoomend', handleZoom);
      };
    }
  });

  async function toggleShipmentSelection(shipmentId: number) {
    console.log('toggleShipmentSelection', shipmentId);
    if (selectedShipments.has(shipmentId)) {
      selectedShipments.delete(shipmentId);
    } else {
      selectedShipments.add(shipmentId);
    }
    selectedShipments = new Set(selectedShipments);

    routePreview = null;
  }

  async function previewRoute() {
    isCreatingRoute = true;
    try {
      const shipmentOperations = Array.from(selectedShipments).map(
        (id) =>
          ({
            id,
            type: RouteOperationType.BOTH,
          }) as ShipmentRouteOperation,
      );

      // Instead of query params, use POST with body
      const response = await authenticatedFetch(
        'http://localhost:5000/routes/simulate',
        {
          method: 'POST', // Change to POST
          body: JSON.stringify({
            shipments: shipmentOperations,
            estimatedStartTime: new Date().toISOString(),
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to simulate route');
      }

      routePreview = await response.json();
    } catch (error) {
      console.error('Failed to preview route:', error);
    } finally {
      isCreatingRoute = false;
    }
  }

  async function createRoute() {
    try {
      const response = await authenticatedFetch(
        'http://localhost:5000/routes',
        {
          method: 'POST',
          body: JSON.stringify({
            shipments: Array.from(selectedShipments).map((id) => ({
              id,
              type: RouteOperationType.BOTH,
            })),
            estimatedStartTime: new Date().toISOString(), // Add current time as start time
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to create route');
      }

      // Clear selection and preview
      selectedShipments = new Set();
      routePreview = null;

      // Could add success notification here

      // Refresh data (you might want to implement this)
      // await refreshData();
    } catch (error) {
      console.error('Failed to create route:', error);
      throw error; // Let RoutePreview component handle the error
    }
  }

  function handleBack() {
    routePreview = null;
  }

  async function handleCreateRoute() {
    await createRoute();
  }

  $inspect(selectedShipments);
  $inspect(currentZoom);
</script>

<svelte:head>
  <title>Drivers</title>
  <meta name="description" content="Svelte demo app" />
</svelte:head>

<ListWrapper bind:isMobileOpen>
  {#if !isWalletConnected}
    <div class="w-full flex justify-center items-center">
      <p
        class="text-center text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent w-2/3"
      >
        Connect your wallet to view shipments
      </p>
    </div>
  {:else}
    <div class="h-full flex w-full flex-col items-center">
      <div class="inline-flex shadow-sm rounded-lg m-4 flex-none">
        {#each categories as { name }, i}
          <button
            class={clsx(
              'px-4 py-2 text-md font-semibold',
              selectedNav == i
                ? 'bg-gradient-to-r from-primary-400 to-secondary-400 text-white'
                : 'bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent',
              i == 0 && 'rounded-l-lg',
              i == categories.length - 1 && 'rounded-r-lg',
            )}
            onclick={() => (selectedNav = i)}
          >
            {name}
          </button>
        {/each}
      </div>

      {#if selectedShipments.size > 0}
        <div class="w-full px-4 py-2 flex justify-end gap-2">
          <button
            class="bg-blue-500 text-white px-4 py-2 rounded-full"
            onclick={previewRoute}
            disabled={isCreatingRoute}
          >
            Preview Route
          </button>
          {#if routePreview}
            <button
              class="bg-green-500 text-white px-4 py-2 rounded-full"
              onclick={handleCreateRoute}
            >
              Create Route
            </button>
          {/if}
        </div>

        {#if routePreview}
          <RoutePreview
            {routePreview}
            onBack={handleBack}
            onCreate={handleCreateRoute}
          />
        {/if}
      {/if}
      {#if categories[selectedNav].data.length > 0}
        <div class="flex-1 flex w-full flex-col overflow-y-auto px-4 mt-5">
          <ul class="w-full flex-1 space-y-4">
            {#each categories[selectedNav].data as shipment}
              <li>
                <ShipmentCard
                  cardType="driver"
                  {shipment}
                  selectable={(categories[selectedNav].type === 'available' &&
                    shipment.status == 'BOUGHT_WITH_ADDRESS') ||
                    shipment.status == 'READY_FOR_PICKUP'}
                  selected={selectedShipments.has(Number(shipment.id))}
                  onSelect={() => toggleShipmentSelection(Number(shipment.id))}
                  >''</ShipmentCard
                >
              </li>
            {/each}
          </ul>
        </div>
      {:else}
        <div class="flex-1 flex items-center">
          <p
            class="mb-5 text-center text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
          >
            No shipments found
          </p>
        </div>
      {/if}
    </div>
  {/if}
</ListWrapper>

{#if !routePreview}
  {#each categories[selectedNav].data as shipment, index}
    {@const isSelected = selectedShipments.has(Number(shipment.id))}
    {@const color = isSelected
      ? `var(--primary-${((index % 3) + 4) * 100})`
      : 'var(--text-300)'}
    {@const shiftX = currentZoom < 14 ? (index % 2) * 10 - 10 : 0}
    {@const shiftY = currentZoom < 14 ? Math.floor(index / 2) * 10 - 10 : 0}

    <Marker
      onClick={() => toggleShipmentSelection(Number(shipment.id))}
      location={shipment.pickup.location ?? { lng: 0, lat: 0 }}
      name={String(index + 1)}
      active={isSelected}
      {color}
      type="P"
      offset={[shiftX, shiftY]}
    />
    <Marker
      onClick={() => toggleShipmentSelection(Number(shipment.id))}
      location={shipment.delivery.location ?? { lng: 0, lat: 0 }}
      name={String(index + 1)}
      active={isSelected}
      {color}
      type="D"
      offset={[shiftX, shiftY]}
    />
  {/each}
{/if}

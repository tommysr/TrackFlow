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

  async function toggleShipmentSelection(shipmentId: number) {
    console.log('toggleShipmentSelection', shipmentId);
    if (selectedShipments.has(shipmentId)) {
      selectedShipments.delete(shipmentId);
    } else {
      selectedShipments.add(shipmentId);
    }
    selectedShipments = new Set(selectedShipments);
  }

  async function previewRoute() {
    isCreatingRoute = true;
    try {
      const response = await authenticatedFetch(
        'http://localhost:5000/routes/preview',
        {
          method: 'POST',
          body: JSON.stringify({
            shipments: Array.from(selectedShipments).map(
              (id) =>
                ({
                  id,
                  type: RouteOperationType.BOTH, // Could be enhanced to allow choosing PICKUP or DELIVERY
                }) as ShipmentRouteOperation,
            ),
          }),
        },
      );

      if (response.ok) {
        routePreview = await response.json();
      }
    } catch (error) {
      console.error('Failed to preview route:', error);
    } finally {
      isCreatingRoute = false;
    }
  }

  async function createRoute() {
    try {
      const response = await authenticatedFetch(
        'http://localhost:5000/routes/create',
        {
          method: 'POST',
          body: JSON.stringify({
            shipments: Array.from(selectedShipments).map((id) => ({
              id,
              type: 'BOTH',
            })),
          }),
        },
      );

      if (response.ok) {
        selectedShipments.clear();
        // Refresh data
      }
    } catch (error) {
      console.error('Failed to create route:', error);
    }
  }

  function handleBack() {
    routePreview = null;
  }

  function handleCreateRoute() {
    createRoute();
  }

  $inspect(selectedShipments);
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
              onclick={createRoute}
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

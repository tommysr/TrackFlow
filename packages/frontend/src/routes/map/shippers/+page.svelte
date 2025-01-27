<script lang="ts">
  import ListWrapper from '$components/ListWrapper.svelte';
  import ShipmentCard from '$components/ShipmentCard.svelte';
  import clsx from 'clsx';
  import type { PageData } from './$types';
  import {
    isBoughtShipment,
    isPendingShipment,
    isInTransitShipment,
    type BoughtShipment,
    type InTransitShipment,
    type PendingShipment,
  } from '$src/lib/extended.shipment';
  import Marker from '$components/Marker.svelte';
  import { wallet } from '$src/lib/wallet.svelte';
  import { MapEvents } from 'svelte-maplibre';

  let { data }: { data: PageData } = $props();

  let isMobileOpen = $state(false);
  let isWalletConnected = $derived($wallet.connected);
  let selectedNav = $state(0);
  let selectedShipment = $state<
    PendingShipment | BoughtShipment | InTransitShipment | null
  >(null);
  let error: string | null = $state(null);
  let previewMarkers = $state<{
    source: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    isPreviewMode: boolean;
  } | null>(null);

  function selectShipment(
    shipment: PendingShipment | BoughtShipment | InTransitShipment,
  ) {
    selectedShipment = shipment;
  }

  const categories: {
    name: string;
    data: PendingShipment[] | BoughtShipment[] | InTransitShipment[];
    type: 'pending' | 'bought' | 'transit';
  }[] = [
    {
      name: 'Pending',
      data: data.pendingShipments,
      type: 'pending',
    },
    {
      name: 'Bought',
      data: data.boughtShipments,
      type: 'bought',
    },
    {
      name: 'In Transit',
      data: data.inTransitShipments,
      type: 'transit',
    },
  ];

  function copyTrackingLink(shipment: PendingShipment | BoughtShipment) {
    const trackingLink = `${window.location.origin}/map/track/${shipment.trackingToken || ''}`;
    navigator.clipboard.writeText(trackingLink);
  }

  function formatDateTime(date: Date | undefined): string {
    if (!date) return 'Not set';
    return new Date(date).toLocaleString();
  }

  function handleMapClick(e: any) {
    if (!previewMarkers?.isPreviewMode) {
      selectedShipment = null;
    }
  }
</script>

<svelte:head>
  <title>Shippers</title>
  <meta name="description" content="Shipments management" />
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
      <!-- Navigation Tabs -->
      <div class="inline-flex shadow-sm rounded-lg m-4 flex-none">
        {#each categories as { name }, i}
          <button
            aria-current="page"
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

      <!-- Shipment List -->
      {#if categories[selectedNav].data.length > 0}
        <div class="flex-1 flex w-full flex-col overflow-y-auto px-4 pt-5">
          <ul class="w-full flex-1 space-y-4">
            {#each categories[selectedNav].data as shipment}
              <li>
                <ShipmentCard
                  cardType="shipper"
                  {shipment}
                  onSelect={() => selectShipment(shipment)}
                  selectable={true}
                >
                  <!-- Additional Info Based on Shipment Type -->
                  <div class="mt-4 space-y-2 text-sm">
                    {#if isInTransitShipment(shipment)}
                      <!-- In Transit Shipment Info -->
                      <div class="flex flex-col gap-2">
                        <p>Carrier: {shipment.assignedCarrier.name}</p>
                        <p>Status: {shipment.status}</p>
                        {#if shipment.estimatedDeliveryDate}
                          <p>
                            Estimated Delivery: {formatDateTime(
                              new Date(shipment.estimatedDeliveryDate),
                            )}
                          </p>
                        {/if}
                        {#if shipment.lastUpdate}
                          <p>
                            Last Updated: {formatDateTime(shipment.lastUpdate)}
                          </p>
                        {/if}
                        <button
                          class="bg-gradient-to-r from-blue-500 to-rose-400 text-white px-4 py-2 rounded-full"
                          onclick={() => copyTrackingLink(shipment)}
                        >
                          Copy Tracking Link
                        </button>
                      </div>
                    {:else if isBoughtShipment(shipment)}
                      <!-- Bought Shipment Info -->
                      <div class="flex flex-col gap-2">
                        <p>Carrier: {shipment.assignedCarrier.name}</p>
                        {#if shipment.pickupTimeWindow}
                          <p>
                            Pickup Window: {formatDateTime(
                              shipment.pickupTimeWindow.start,
                            )} - {formatDateTime(shipment.pickupTimeWindow.end)}
                          </p>
                        {/if}
                        {#if shipment.deliveryTimeWindow}
                          <p>
                            Delivery Window: {formatDateTime(
                              shipment.deliveryTimeWindow.start,
                            )} - {formatDateTime(
                              shipment.deliveryTimeWindow.end,
                            )}
                          </p>
                        {/if}
                        
                        <button
                          class="bg-gradient-to-r from-blue-500 to-rose-400 text-white px-4 py-2 rounded-full"
                          onclick={() => copyTrackingLink(shipment)}
                        >
                          Copy Tracking Link
                        </button>
                      </div>
                    {:else if isPendingShipment(shipment)}
                      <!-- Pending Shipment Info -->
                      <div class="flex flex-col gap-4">
                        {#if shipment.trackingToken}
                          <button
                            class="bg-gradient-to-r from-blue-500 to-rose-400 text-white px-4 py-2 rounded-full"
                            onclick={() => copyTrackingLink(shipment)}
                          >
                            Copy Tracking Link
                          </button>
                        {/if}
                      </div>
                    {/if}
                  </div>
                </ShipmentCard>
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

<!-- Map Markers -->
{#if !selectedShipment}
  {#each categories[selectedNav].data as shipment}
    <Marker
      onClick={() => selectShipment(shipment)}
      location={shipment.pickup
        ? { lat: shipment.pickup.lat, lng: shipment.pickup.lng }
        : { lat: shipment.info.source.lat, lng: shipment.info.source.lng }}
      name={shipment.pickup ? 'P' : 'Es P'}
    />
  {/each}
{:else}
  <Marker
    onClick={() => (selectedShipment = null)}
    location={selectedShipment.pickup
      ? { lat: selectedShipment.pickup.lat, lng: selectedShipment.pickup.lng }
      : {
          lat: selectedShipment.info.source.lat,
          lng: selectedShipment.info.source.lng,
        }}
    name={selectedShipment.pickup ? 'P' : 'Es P'}
  />
  <Marker
    onClick={() => (selectedShipment = null)}
    location={selectedShipment.delivery
      ? {
          lat: selectedShipment.delivery.lat,
          lng: selectedShipment.delivery.lng,
        }
      : {
          lat: selectedShipment.info.destination.lat,
          lng: selectedShipment.info.destination.lng,
        }}
    name={selectedShipment.delivery ? 'D' : 'Es D'}
  />
{/if}

<MapEvents on:click={handleMapClick} />

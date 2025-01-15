<script lang="ts">
  import ListWrapper from '$components/ListWrapper.svelte';
  import ShipmentCard from '$components/ShipmentCard.svelte';
  import clsx from 'clsx';
  import type { PageData } from './$types';
  import {
    isBoughtShipment,
    isPendingShipment,
    type BoughtShipment,
    type InTransitShipment,
    type PendingShipment,
  } from '$src/lib/extended.shipment';
  import Marker from '$components/Marker.svelte';
  import { wallet } from '$src/lib/wallet.svelte';
  import type { Shipment } from '../../../../../declarations/canister/canister.did';
  import AddressForm from '$components/AddressForm.svelte';
  import Modal from '$components/Modal.svelte';
  import { authenticatedFetch } from '$src/lib/canisters';
  import { invalidateAll } from '$app/navigation';
  import { Marker as M, MapEvents } from 'svelte-maplibre';
    import { Ship } from 'lucide-svelte';


  let { data }: { data: PageData } = $props();

  let isMobileOpen = $state(false);
  let isWalletConnected = $derived($wallet.connected);
  let selectedNav = $state(0);
  let showAddressModal = $state(false);
  let selectedShipment = $state<PendingShipment | null>(null);
  let isLoading = $state(false);
  let error: string | null = $state(null);
  let previewMarkers = $state<{
    source: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    isPreviewMode: boolean;
  } | null>(null);

  function selectShipment(
    shipment: PendingShipment | BoughtShipment | InTransitShipment,
  ) {
    console.log('selectShipment', shipment, 'previewMarkers', previewMarkers?.isPreviewMode);
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

  function openAddressModal(shipment: PendingShipment) {
    selectedShipment = shipment;
    showAddressModal = true;
  }

  function copyTrackingLink(shipment: PendingShipment) {
    const trackingLink = `${window.location.origin}/map/track/${shipment.trackingToken || ''}`;
    navigator.clipboard.writeText(trackingLink);
  }

  async function markReadyForPickup(shipment: BoughtShipment) {
    isLoading = true;
    error = null;

    try {
      const response = await authenticatedFetch(
        `http://localhost:5000/shipments/${shipment.id}/ready-for-pickup`,
        { method: 'POST' },
      );

      if (response.ok) {
        await invalidateAll();
      } else {
        const errorData = await response.json();
        error = errorData.message || 'Failed to mark as ready for pickup';
      }
    } catch (e: any) {
      error = e.message || 'Failed to mark as ready for pickup';
    } finally {
      isLoading = false;
    }
  }

  function handleMapClick(e: any) {
    if (!previewMarkers?.isPreviewMode) {
      selectedShipment = null;
    }
  }

  $inspect(data);
</script>

<svelte:head>
  <title>Shippers</title>
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

      {#if categories[selectedNav].data.length > 0}
        <div class="flex-1 flex w-full flex-col overflow-y-auto px-4 mt-5">
          <ul class="w-full flex-1 space-y-4">
            {#each categories[selectedNav].data as shipment}
              <li>
                <ShipmentCard cardType="shipper" {shipment}>
                  {#if isBoughtShipment(shipment)}
                    <div class="flex mt-4 gap-5 justify-center">
                      <button
                        class="bg-gradient-to-r from-blue-500 to-rose-400 text-white px-4 py-2 rounded-full disabled:opacity-50"
                        onclick={() => copyTrackingLink(shipment)}
                      >
                        Copy Tracking Link
                      </button>
                      {#if shipment.status == 'BOUGHT_WITH_ADDRESS'}
                        <button
                          class="bg-gradient-to-r from-blue-500 to-rose-400 text-white px-4 py-2 rounded-full disabled:opacity-50"
                          onclick={() =>
                            markReadyForPickup(shipment as BoughtShipment)}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Marking...' : 'Mark Ready for Pickup'}
                        </button>
                      {/if}
                    </div>

                    {#if error}
                      <div
                        class="mt-2 p-2 bg-red-50 rounded text-red-700 text-sm"
                      >
                        {error}
                      </div>
                    {/if}
                  {:else if isPendingShipment(shipment)}
                    <div class="flex mt-4 gap-5 justify-center">
                      {#if shipment.trackingToken}
                        <button
                          class="bg-gradient-to-r from-blue-500 to-rose-400 text-white px-4 py-2 rounded-full disabled:opacity-50"
                          onclick={() => copyTrackingLink(shipment)}
                        >
                          Copy Tracking Link
                        </button>
                      {:else}
                        <button
                          class="bg-gradient-to-r from-blue-500 to-rose-400 text-white px-4 py-2 rounded-full disabled:opacity-50"
                          onclick={() => openAddressModal(shipment)}
                        >
                          Set Address
                        </button>
                      {/if}
                    </div>
                  {/if}
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

<AddressForm
  shipment={selectedShipment}
  bind:showModal={showAddressModal}
  onClose={() => (showAddressModal = false)}
  onCoordinates={(e) => (previewMarkers = e)}
/>

{#if !selectedShipment && !previewMarkers?.isPreviewMode}
  {#each categories[selectedNav].data as shipment}
    <Marker
      onClick={() => selectShipment(shipment)}
      location={shipment.pickup.location ? shipment.pickup.location : shipment.info.source}
      name={'P'}
    />
  {/each}
{:else if selectedShipment && !previewMarkers?.isPreviewMode}
  <Marker
    onClick={() => selectedShipment = null}
    location={selectedShipment.pickup.location ? selectedShipment.pickup.location : selectedShipment.info.source}
    name={'P'}
  />
  <Marker
    onClick={() => selectedShipment = null}
    location={selectedShipment.delivery.location ? selectedShipment.delivery.location : selectedShipment.info.destination}
    name={'D'}
  />
{:else if previewMarkers}
  <M
    lngLat={[previewMarkers.source.lng, previewMarkers.source.lat]}
    draggable={true}
    on:dragend={(e) => {
      const [lng, lat] = e.detail.lngLat;
      previewMarkers = {
        ...previewMarkers!,
        destination: previewMarkers!.destination,
        isPreviewMode: previewMarkers!.isPreviewMode,
        source: { lat, lng },
      };
    }}
  >
    <div class="pin bounce-a active">P</div>
  </M>

  <M
    lngLat={[previewMarkers.destination.lng, previewMarkers.destination.lat]}
    draggable={true}
    on:dragend={(e) => {
      const [lng, lat] = e.detail.lngLat;
      previewMarkers = {
        ...previewMarkers!,
        source: previewMarkers!.source,
        isPreviewMode: previewMarkers!.isPreviewMode,
        destination: { lat, lng },
      };
    }}
  >
    <div class="pin bounce-a active">D</div>
  </M>
{/if}

<MapEvents on:click={handleMapClick} />

<style>
  .pin {
    width: 30px;
    height: 30px;
    border-radius: 50% 50% 50% 0;
    background: #00cae9;
    position: absolute;
    transform: rotate(-45deg);
    left: 50%;
    top: 50%;
    margin: -15px 0 0 -15px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
  }

  .pin.active {
    background: linear-gradient(45deg, #00cae9, #e95f8a);
  }

  .pin :global(span) {
    transform: rotate(45deg);
  }

  .bounce-a {
    animation: bounce 0.5s ease-in-out infinite alternate;
  }

  @keyframes bounce {
    from {
      transform: rotate(-45deg) translateY(0);
    }
    to {
      transform: rotate(-45deg) translateY(-5px);
    }
  }
</style>

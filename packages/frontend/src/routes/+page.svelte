<script lang="ts">
  import CreateShipmentForm from '$components/CreateShipmentForm.svelte';
  import AddressForm from '$components/AddressForm.svelte';
  import TimeWindowForm from '$components/TimeWindowForm.svelte';
  import { wallet } from '$lib/wallet.svelte';
  import { Plus } from 'lucide-svelte';
  import type { LayoutData } from './$types';
  import Marker from '$components/Marker.svelte';
  import type { Shipment } from '../../../declarations/canister/canister.did';
  import Modal from '$components/Modal.svelte';
  import ShipmentInfo from '$components/ShipmentInfo.svelte';
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { Marker as M } from 'svelte-maplibre';

  let showAddModal = $state(false);
  let showBuyModal = $state(false);
  let selected = $state<Shipment | null>(null);
  let currentStep = $state(1); // 1: Create, 2: Address, 3: Time Windows
  let createdShipmentId = $state<string | null>(null);

  const {
    data,
  }: {
    data: LayoutData;
  } = $props();

  function selectShipment(id: bigint) {
    selected =
      [...data.pendingShipments, ...data.created, ...data.carried].find(
        (shipment) => shipment.id === id,
      ) ?? undefined;
    showBuyModal = true;
  }

  async function buy(shipment: Shipment) {
    if (!$wallet.connected) await wallet.connect();
    if (!$wallet.connected) return;

    const error = await $wallet.actor.buyShipment('Jacek', shipment.id);

    await invalidateAll();

    selected = null;
    showBuyModal = false;
  }

  async function handleShipmentCreated(id: string) {
    createdShipmentId = id;
    currentStep = 2;
  }

  function moveToTimeWindows() {
    previewMarkers = null;
    currentStep = 3;
  }

  function skipToComplete() {
    showAddModal = false;
    currentStep = 1;
    createdShipmentId = null;
    previewMarkers = null;
    invalidateAll();
  }

  let previewMarkers = $state<{
    source: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    isPreviewMode: boolean;
  } | null>(null);

  onMount(async () => {
    await invalidateAll();
  });

  $inspect(previewMarkers);
</script>

<svelte:head>
  <title>Home</title>
  <meta name="description" content="Svelte demo app" />
</svelte:head>

<!-- Step 1: Create Shipment -->
{#if showAddModal && currentStep === 1}
  <CreateShipmentForm
    showModal={true}
    onClose={skipToComplete}
    onShipmentCreated={handleShipmentCreated}
  />
{/if}

<!-- Step 2: Set Addresses (Optional) -->
{#if showAddModal && currentStep === 2 && createdShipmentId}
  <AddressForm
    shipmentId={createdShipmentId}
    showModal={true}
    onClose={skipToComplete}
    onCoordinates={(e) => (previewMarkers = e)}
    onAddressesSet={moveToTimeWindows}
  />
{/if}

<!-- Step 3: Set Time Windows (Optional) -->
{#if showAddModal && currentStep === 3 && createdShipmentId}
  <TimeWindowForm
    shipmentId={createdShipmentId}
    showModal={true}
    onClose={skipToComplete}
  />
{/if}

{#if !showAddModal}
  {#each data.pendingShipments as { id, info }}
    <Marker
      onClick={() => selectShipment(id)}
      location={info.source}
      name={'P'}
    />
  {/each}
{/if}

<Modal bind:showModal={showBuyModal} onClose={() => (showBuyModal = false)}>
  {#if selected}
    <ShipmentInfo shipment={selected} />
  {/if}

  <button
    class="bg-gradient-to-r from-blue-500 to-rose-400 rounded-full px-7 py-2 w-1/2 mx-auto text-white text-base transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
    onclick={() => buy(selected!)}>Buy</button
  >
</Modal>

<div class="absolute bottom-16 right-16 z-50">
  <div
    class="flex rounded-full mx-auto bg-gradient-to-tr from-primary via-secondary to-rose-400 p-0.5 shadow-lg transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
  >
    <button
      onclick={() => {
        if (!$wallet.connected) wallet.connect();
        showAddModal = true;
        currentStep = 1;
      }}
      class="rounded-full w-20 h-20 bg-white flex justify-center items-center"
    >
      <Plus size={55} class="stroke-secondary-400" />
    </button>
  </div>
</div>

{#if previewMarkers}
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

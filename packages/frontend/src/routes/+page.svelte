<script lang="ts">
  import CreateShipmentForm from '$components/CreateShipmentForm.svelte';
  import { wallet } from '$lib/wallet.svelte';
  import { Plus } from 'lucide-svelte';
  import type { PageData } from './$types';
  import Marker from '$components/Marker.svelte';
  import type { Shipment } from '../../../declarations/canister/canister.did';
  import Modal from '$components/Modal.svelte';
  import TextInput from '$components/TextInput.svelte';
  import ShipmentInfo from '$components/ShipmentInfo.svelte';
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';

  let showAddModal = $state(false);
  let showBuyModal = $state(false);
  let selected = $state<Shipment | null>(null);

  const {
    data,
  }: {
    data: PageData;
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
    console.log(error);

    await invalidateAll();

    selected = null;
    showBuyModal = false;
  }

  onMount(async () => {
    await invalidateAll();
  });
</script>

<svelte:head>
  <title>Home</title>
  <meta name="description" content="Svelte demo app" />
</svelte:head>

<CreateShipmentForm
  showModal={showAddModal}
  onClose={() => (showAddModal = false)}
/>

{#if !showAddModal}
  {#each data.pendingShipments as { id, info }}
    <Marker
      onClick={() => selectShipment(id)}
      location={info.source}
      name={id}
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
      }}
      class="rounded-full w-20 h-20 bg-white flex justify-center items-center"
    >
      <Plus size={55} class="stroke-secondary-400" />
    </button>
  </div>
</div>

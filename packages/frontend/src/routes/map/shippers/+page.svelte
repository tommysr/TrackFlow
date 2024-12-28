<script lang="ts">
  import ListWrapper from '$components/ListWrapper.svelte';
  import ShipmentCard from '$components/ShipmentCard.svelte';
  import clsx from 'clsx';
  import type { PageData } from './$types';
  import type { ExtendedShipment } from '$src/lib/extended.shipment';
  import Marker from '$components/Marker.svelte';
  import { wallet } from '$src/lib/wallet.svelte';
    import type { Shipment } from '../../../../../declarations/canister/canister.did';

  let { data }: { data: PageData } = $props();

  let isMobileOpen = $state(false);
  let isWalletConnected = $derived($wallet.connected);
  let selectedNav = $state(0);
  let selected = $state<Shipment | null>(null);


  function selectShipment(id: bigint) {
    selected =
      [...data.pendingShipments, ...data.created, ...data.carried].find(
        (shipment) => shipment.id === id,
      );
  }

  const categories: {
    name: string;
    data: ExtendedShipment[];
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

  $inspect(data);
</script>

<svelte:head>
  <title>Shippers</title>
  <meta name="description" content="Svelte demo app" />
</svelte:head>

{#if isWalletConnected}
  {#each categories[selectedNav].data as { id, info }}
    <Marker onClick={() => selectShipment(id)} location={info.source} />
  {/each}
{/if}

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
                <ShipmentCard
                  {shipment}
                  cardType={categories[selectedNav].type}
                />
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

<script>
  import ListWrapper from '$components/ListWrapper.svelte';
  import clsx from 'clsx';

  let isMobileOpen = $state(false);
  let isWalletConnected = $state(true);
  let selectedNav = $state(0);

  const insideNavData = [
    {
      name: 'Pending',
      data: [1, 2, 3],
    },
    {
      name: 'Bought',
      data: [1, 2, 3],
    },
    {
      name: 'In Transit',
      data: [1, 2, 3],
    },
  ];
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
        {#each insideNavData as { name }, i}
          <button
            aria-current="page"
            class={clsx(
              'px-4 py-2 text-md font-semibold',
              selectedNav == i
                ? 'bg-gradient-to-r from-primary-400 to-secondary-400 text-white'
                : 'bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent',
              i == 0 && 'rounded-l-lg',
              i == insideNavData.length - 1 && 'rounded-r-lg',
            )}
            onclick={() => (selectedNav = i)}
          >
            {name}
          </button>
        {/each}
      </div>

      {#if insideNavData[selectedNav] && insideNavData[selectedNav].data.length != 0}
        <div class="flex-1 flex w-full flex-col overflow-y-auto px-4 mt-5">
          <ul class="w-full flex-1 space-y-4">
            {#each insideNavData[selectedNav].data as item}
              <li>{item}</li>
            {/each}
          </ul>
        </div>
      {:else}
        <div class="flex-1 flex items-center">
          <p
            class="mb-5 text-center text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
          >
            Nothing found
          </p>
        </div>
      {/if}
    </div>
  {/if}
</ListWrapper>

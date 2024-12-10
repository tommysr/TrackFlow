<script>
  import CreateShipmentForm from '$components/CreateShipmentForm.svelte';
  import PlusIcon from '$components/PlusIcon.svelte';
  import { wallet } from '$lib/wallet.svelte';
	import { Plus } from 'lucide-svelte';

  let showAddModal = $state(false);
</script>

<svelte:head>
  <title>Home</title>
  <meta name="description" content="Svelte demo app" />
</svelte:head>

<CreateShipmentForm
  showModal={showAddModal}
  onClose={() => (showAddModal = false)}
/>

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

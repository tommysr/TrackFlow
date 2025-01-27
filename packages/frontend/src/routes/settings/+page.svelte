<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { wallet } from '$src/lib/wallet.svelte';
  import { authenticatedFetch } from '$src/lib/canisters';
  import Modal from '$components/Modal.svelte';

  let showModal = $state(true);
  let name = $state('');
  let contact = $state('');
  let loading = $state(false);
  let message = $state('');
  let roles = $state<string[]>([]);
  let error = $state('');

  onMount(async () => {
    if (!$wallet.connected) {
      goto('/');
      return;
    }
    // Load current profile data
    try {
      const response = await authenticatedFetch(
        'http://localhost:5000/auth/profile',
      );
      const data = await response.json();
      name = data.name || '';
      contact = data.contact || '';
      roles = data.roles || [];
    } catch (err) {
      error = 'Failed to load profile data';
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    loading = true;
    error = '';
    message = '';

    try {
      const response = await authenticatedFetch(
        'http://localhost:5000/auth/profile',
        {
          method: 'PUT',
          body: JSON.stringify({ name, contact }),
        },
      );

      const data = await response.json();
      message = 'Profile updated successfully';
      // Close modal after successful update
      setTimeout(() => {
        showModal = false;
        goto('/');
      }, 1500);
    } catch (err) {
      error = 'Failed to update profile';
    } finally {
      loading = false;
    }
  }

  function handleClose() {
    showModal = false;
    goto('/');
  }
</script>

<Modal {showModal} onClose={handleClose}>
  <form method="POST" class="flex flex-col space-y-7 w-full" onsubmit={handleSubmit}>
    <h1 class="text-3xl text-center font-semibold inline-block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-5">
      Profile Settings
    </h1>

    <div>
      <label for="name" class="block text-sm font-medium text-gray-700">Name</label>
      <input
        type="text"
        id="name"
        bind:value={name}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder="Your name"
      />
    </div>

    <div>
      <label for="contact" class="block text-sm font-medium text-gray-700">Contact Email</label>
      <input
        type="email"
        id="contact"
        bind:value={contact}
        class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        placeholder="your.email@example.com"
      />
      <p class="mt-1 text-sm text-gray-500">
        This email will be used for shipment and route notifications.
      </p>
    </div>

    {#if message}
      <div class="p-3 bg-green-100 text-green-700 rounded">
        {message}
      </div>
    {/if}

    {#if error}
      <div class="p-3 bg-red-100 text-red-700 rounded">
        {error}
      </div>
    {/if}

    <button
      type="submit"
      disabled={loading}
      class="bg-gradient-to-r from-blue-500 to-rose-400 rounded-full px-7 py-2 w-3/5 mx-auto text-white text-base transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
    >
      {loading ? 'Saving...' : 'Save Changes'}
    </button>
  </form>
</Modal>

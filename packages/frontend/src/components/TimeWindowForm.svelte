<script lang="ts">
  import Modal from './Modal.svelte';
  import type { BoughtShipment } from '$lib/extended.shipment';
  import { authenticatedFetch } from '$src/lib/canisters';
  import { invalidateAll } from '$app/navigation';

  interface TimeWindowProps {
    showModal: boolean;
    onClose: () => void;
    shipmentId: string;
  }

  let {
    showModal = $bindable(),
    onClose,
    shipmentId,
  }: TimeWindowProps = $props();

  async function fetchTimeWindows() {
    try {
      const response = await authenticatedFetch(
        `http://localhost:5000/shipments/${shipmentId}/time-windows`,
      );
      const timeWindows = await response.json();

      if (timeWindows.pickup) {
        pickupStart = timeWindows.pickup.start;
        pickupEnd = timeWindows.pickup.end;
      } else {
        pickupStart = new Date();
        pickupEnd = new Date();
      }
      if (timeWindows.delivery) {
        deliveryStart = timeWindows.delivery.start;
        deliveryEnd = timeWindows.delivery.end;
      } else {
        deliveryStart = new Date();
        deliveryEnd = new Date();
      }
    } catch (error) {
      console.error('Failed to fetch time windows', error);
    }
  }

  let pickupStart: Date | null = $state(null);
  let pickupEnd: Date | null = $state(null);
  let deliveryStart: Date | null = $state(null);
  let deliveryEnd: Date | null = $state(null);
  let error: string | null = $state(null);
  let isLoading = $state(false);

  $effect(() => {
    if (showModal) {
      fetchTimeWindows();
    }
  });

  async function setTimeWindows(e: Event) {
    e.preventDefault();
    error = null;
    isLoading = true;

    try {
      const response = await authenticatedFetch(
        `http://localhost:5000/shipments/${shipmentId}/time-windows`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pickup: {
              start: pickupStart,
              end: pickupEnd,
            },
            delivery: {
              start: deliveryStart,
              end: deliveryEnd,
            },
          }),
        },
      );

      if (response.ok) {
        await invalidateAll();
        onClose();
      } else {
        const errorData = await response.json();
        error = errorData.message || 'Failed to set time windows';
      }
    } catch (e: any) {
      error = e.message || 'Failed to set time windows';
    } finally {
      isLoading = false;
    }
  }
</script>

<Modal bind:showModal {onClose}>
  <form
    method="POST"
    class="flex flex-col space-y-7 w-full"
    onsubmit={setTimeWindows}
  >
    <h1
      class="text-3xl text-center font-semibold inline-block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-5"
    >
      Set Time Windows
    </h1>

    <div class="grid grid-cols-2 gap-8">
      <div class="space-y-4">
        <h2 class="text-xl font-semibold text-center">Pickup</h2>
        <div class="space-y-2">
          <label for="pickupStart">Start Time</label>
          <input
            type="datetime-local"
            id="pickupStart"
            bind:value={pickupStart}
            class="w-full rounded-lg border-2 border-gray-300 p-2"
            required
          />
        </div>
        <div class="space-y-2">
          <label for="pickupEnd">End Time</label>
          <input
            type="datetime-local"
            id="pickupEnd"
            bind:value={pickupEnd}
            class="w-full rounded-lg border-2 border-gray-300 p-2"
            required
          />
        </div>
      </div>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold text-center">Delivery</h2>
        <div class="space-y-2">
          <label for="deliveryStart">Start Time</label>
          <input
            type="datetime-local"
            id="deliveryStart"
            bind:value={deliveryStart}
            class="w-full rounded-lg border-2 border-gray-300 p-2"
            required
          />
        </div>
        <div class="space-y-2">
          <label for="deliveryEnd">End Time</label>
          <input
            type="datetime-local"
            id="deliveryEnd"
            bind:value={deliveryEnd}
            class="w-full rounded-lg border-2 border-gray-300 p-2"
            required
          />
        </div>
      </div>
    </div>

    {#if error}
      <div class="mt-2 p-2 bg-red-50 rounded text-red-700 text-sm">
        {error}
      </div>
    {/if}

    <button
      type="submit"
      class="bg-gradient-to-r from-blue-500 to-rose-400 rounded-full px-7 py-2 w-3/5 mx-auto text-white text-base transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
      disabled={isLoading}
    >
      {isLoading ? 'Setting...' : 'Set Time Windows'}
    </button>
  </form>
</Modal>

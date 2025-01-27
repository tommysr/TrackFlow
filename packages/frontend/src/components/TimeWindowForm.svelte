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
        const pickupStartDate = new Date(timeWindows.pickup.start);
        const pickupEndDate = new Date(timeWindows.pickup.end);
        pickupStart = new Date(pickupStartDate.getTime() - pickupStartDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        pickupEnd = new Date(pickupEndDate.getTime() - pickupEndDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      } 
      if (timeWindows.delivery) {
        const deliveryStartDate = new Date(timeWindows.delivery.start);
        const deliveryEndDate = new Date(timeWindows.delivery.end);
        deliveryStart = new Date(deliveryStartDate.getTime() - deliveryStartDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          deliveryEnd = new Date(deliveryEndDate.getTime() - deliveryEndDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      } 
    } catch (error) {
      console.error('Failed to fetch time windows', error);
    }
  }

  let pickupStart: string = $state(new Date().toISOString().slice(0, 16));
  let pickupEnd: string = $state(new Date().toISOString().slice(0, 16));
  let deliveryStart: string = $state(new Date().toISOString().slice(0, 16));
  let deliveryEnd: string = $state(new Date().toISOString().slice(0, 16));
  let error: string = $state('');
  let isLoading = $state(false);

  $effect(() => {
    if (showModal) {
      fetchTimeWindows();
    }
  });

  async function setTimeWindows(e: Event) {
    e.preventDefault();
    error = '';
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
            min={new Date().toISOString().slice(0, 16)}
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
            min={new Date().toISOString().slice(0, 16)}
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
            min={new Date().toISOString().slice(0, 16)}
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
            min={new Date().toISOString().slice(0, 16)}
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

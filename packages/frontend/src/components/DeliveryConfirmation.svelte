<script lang="ts">
  import { authenticatedFetch } from '$lib/canisters';
  import { ShipmentStatus, type RouteStop, type Shipment } from '$lib/types/route.types';
  import { wallet } from '$src/lib/wallet.svelte';

  let {
    stop,
    onClose,
    onConfirmed,
  }: { stop: RouteStop; onClose: () => void; onConfirmed: () => void } =
    $props();

  let secretKey = $state('');
  let isSubmitting = $state(false);
  let error = $state<string | null>(null);
  let isDelivered = $state(false);

  async function checkDeliveryStatus() {
    isSubmitting = true;
    error = null;

    try {
      const response = await authenticatedFetch(
        'http://localhost:5000/routes/check-delivery',
        {
          method: 'POST',
          body: JSON.stringify({ shipmentId: stop.shipmentId }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to check delivery status');
      }

      const data: { updatedStop: RouteStop; updatedShipment: Shipment } =
        await response.json();
      isDelivered = data.updatedShipment.status === ShipmentStatus.DELIVERED;

      if (isDelivered) {
        onConfirmed();
      }
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to check delivery status';
    } finally {
      isSubmitting = false;
    }
  }

  async function handleSubmit() {
    isSubmitting = true;
    error = null;

    if (!secretKey) {
      error = 'Please enter the secret key';
      return;
    }

    if (!$wallet.connected) await wallet.connect();
    if (!$wallet.connected) {
      error = 'Please connect your wallet';
      return;
    }

    if (!stop.shipment?.canisterShipmentId) {
      error = 'Shipment ID is missing';
      return;
    }

    try {
      const res = await $wallet.actor.finalizeShipment(
        BigInt(stop.shipment.canisterShipmentId),
        [secretKey],
      );

      if ('Err' in res) {
        error = `${res.Err}`;
        console.error(res.Err);
        return;
      }

      // First finalize the shipment in ICP
      const finalizeResponse = await authenticatedFetch(
        `http://localhost:4943/finalizeShipment`,
        {
          method: 'POST',
          body: JSON.stringify({
            shipmentId: stop.shipmentId,
            secretKey,
          }),
        },
      );

      if (!finalizeResponse.ok) {
        throw new Error('Failed to finalize shipment');
      }

      await checkDeliveryStatus();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to confirm delivery';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div
  class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
>
  <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
    <h3 class="text-lg font-semibold mb-4">Confirm Delivery</h3>

    <div class="mb-4">
      <label
        class="block text-sm font-medium text-gray-700 mb-1"
        for="secretKey"
      >
        Secret Key
      </label>
      <input
        type="text"
        bind:value={secretKey}
        class="w-full px-3 py-2 border rounded-md"
        placeholder="Enter delivery secret key"
        id="secretKey"
      />
    </div>

    {#if error}
      <div class="mb-4 text-sm text-red-600">
        {error}
      </div>
    {/if}

    <div class="flex justify-end gap-2">
      <button
        class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
        onclick={onClose}
        disabled={isSubmitting}
      >
        Cancel
      </button>
      <button
        class="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
        onclick={checkDeliveryStatus}
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Checking...' : 'Check Status'}
      </button>
      <button
        class="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        onclick={handleSubmit}
        disabled={isSubmitting || isDelivered}
      >
        {#if isDelivered}
          Already Delivered
        {:else if isSubmitting}
          Confirming...
        {:else}
          Confirm Delivery
        {/if}
      </button>
    </div>
  </div>
</div>

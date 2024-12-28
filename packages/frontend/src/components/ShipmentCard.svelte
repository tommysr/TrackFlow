<script lang="ts">
  import type { ExtendedShipment } from '$lib/extended.shipment';
  import { formatDistance } from 'date-fns';


  let { shipment, cardType }: { shipment: ExtendedShipment, cardType: 'pending' | 'bought' | 'transit' } = $props();

  let isToday = $derived((date?: Date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  });
</script>

<div class="bg-white rounded-lg shadow p-4 space-y-3">
  <div class="flex justify-between items-center">
    <h3 class="text-lg font-semibold">{shipment.name}</h3>
    <span class="text-sm text-gray-500">ID: {shipment.id}</span>
  </div>

  <div class="grid grid-cols-2 gap-4">
    <div>
      <span class="text-sm text-gray-500">Value</span>
      <p class="font-medium">${shipment.info.value}</p>
    </div>
    <div>
      <span class="text-sm text-gray-500">Price</span>
      <p class="font-medium">${shipment.info.price}</p>
    </div>
  </div>

  {#if cardType !== 'pending'}
    <div class="space-y-2">
      {#if shipment.pickupDate}
        <div class="flex justify-between">
          <span class="text-sm text-gray-500">Pickup</span>
          <span class={isToday(shipment.pickupDate) ? 'text-green-500' : ''}>
            {shipment.pickupDate.toLocaleDateString()}
          </span>
        </div>
      {/if}
      {#if shipment.deliveryDate}
        <div class="flex justify-between">
          <span class="text-sm text-gray-500">Delivery</span>
          <span class={isToday(shipment.deliveryDate) ? 'text-green-500' : ''}>
            {shipment.deliveryDate.toLocaleDateString()}
          </span>
        </div>
      {/if}
    </div>
  {/if}

  {#if cardType === 'transit' && shipment.lastUpdate}
    <div class="space-y-2 border-t pt-2">
      <div class="flex justify-between">
        <span class="text-sm text-gray-500">Last Update</span>
        <span>{formatDistance(shipment.lastUpdate, new Date(), { addSuffix: true })}</span>
      </div>
      {#if shipment.eta}
        <div class="flex justify-between">
          <span class="text-sm text-gray-500">ETA</span>
          <span>{shipment.eta} minutes</span>
        </div>
      {/if}
    </div>
  {/if}
</div> 
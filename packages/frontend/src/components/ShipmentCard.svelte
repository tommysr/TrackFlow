<script lang="ts">
  import {
    isBoughtShipment,
    isInTransitShipment,
    isPendingShipment,
    type AddressLocationResponse,
    type BoughtShipment,
    type InTransitShipment,
    type PendingShipment,
  } from '$lib/extended.shipment';
  import { formatDistance } from 'date-fns';
  import type { Snippet } from 'svelte';

  let {
    shipment,
    children,
    selectable,
    selected,
    onSelect,
    cardType,
  }: {
    shipment: PendingShipment | BoughtShipment | InTransitShipment;
    children?: Snippet;
    selectable?: boolean;
    selected?: boolean;
    onSelect?: () => void;
    cardType?: 'shipper' | 'driver';
  } = $props();

  let isToday = $derived((date?: Date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  });

  const formatLocation = (addressLocation: AddressLocationResponse) => {
    return `${addressLocation.address?.street}, ${addressLocation.address?.city}`;
  };

  function handleClick() {
    if (selectable) {
      onSelect?.();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }

  $inspect(selected);
</script>

<div
  class="bg-white rounded-lg shadow p-4 space-y-3 cursor-pointer {selectable
    ? 'hover:ring-4 hover:ring-blue-400'
    : 'bg-gray-300'} {selected ? 'ring-4 ring-blue-500' : ''}"
  onclick={handleClick}
  onkeydown={handleKeyDown}
  role="button"
  tabindex="0"
>
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

  <div class="grid grid-cols-2 gap-4 mb-3">
    <div>
      <span class="text-sm text-gray-500">Pickup</span>
      <p class="font-medium">
        {shipment.pickup ? formatLocation(shipment.pickup) : ''}
      </p>
    </div>
    <div>
      <span class="text-sm text-gray-500">Delivery</span>
      <p class="font-medium">
        {shipment.delivery ? formatLocation(shipment.delivery) : ''}
      </p>
    </div>
  </div>

  {#if isBoughtShipment(shipment) && cardType === 'shipper'}
    <div class="space-y-2">
      <div class="flex justify-between">
        <span class="text-sm text-gray-500">Estimated Pickup</span>
        {#if shipment.estimatedPickupDate}
          {@const pickupDate = new Date(shipment.estimatedPickupDate)}
          <span class={isToday(pickupDate) ? 'text-green-500' : ''}>
            {pickupDate.toLocaleString()}
            
          </span>
        {/if}
      </div>
      <div class="flex justify-between">
        <span class="text-sm text-gray-500">Estimated Delivery</span>
        {#if shipment.estimatedDeliveryDate}
          {@const deliveryDate = new Date(shipment.estimatedDeliveryDate)}
          <span class={isToday(deliveryDate) ? 'text-green-500' : ''}>
            {deliveryDate.toLocaleString  ()}
          
          </span>
        {/if}
      </div>
    </div>
  {/if}

  {#if isInTransitShipment(shipment)}
    <div class="space-y-2">
      {#if shipment.lastUpdate}
        <div class="flex justify-between">
          <span class="text-sm text-gray-500">Last Update</span>
          <span
            >{formatDistance(shipment.lastUpdate, new Date(), {
              addSuffix: true,
            })}</span
          >
        </div>
      {/if}
      {#if shipment.eta}
        <div class="flex justify-between">
          <span class="text-sm text-gray-500">ETA</span>
          <span>{shipment.eta} minutes</span>
        </div>
      {/if}
      {#if shipment.currentLocation}
        <div class="flex justify-between">
          <span class="text-sm text-gray-500">Current Location</span>
          <span>
            {shipment.currentLocation.lat.toFixed(4)}, {shipment.currentLocation.lng.toFixed(
              4,
            )}
          </span>
        </div>
      {/if}
    </div>
  {/if}

  {@render children?.()}
</div>

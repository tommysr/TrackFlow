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
    children: Snippet;
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
    if (addressLocation.isComplete) {
      return `${addressLocation.address?.street}, ${addressLocation.address?.city}`;
    }
    if (addressLocation.location) {
      return `Approx. (${addressLocation.location.lat.toFixed(4)}, ${addressLocation.location.lng.toFixed(4)})`;
    }
    return 'Unknown';
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

  {#if isPendingShipment(shipment)}
    <div class="grid grid-cols-2 gap-4">
      <div>
        <span class="text-sm text-gray-500">Pickup Location</span>
        <p class="font-medium">
          {formatLocation(shipment.pickup)}
        </p>
      </div>
      <div>
        <span class="text-sm text-gray-500">Delivery Location</span>
        <p class="font-medium">
          {formatLocation(shipment.delivery)}
        </p>
      </div>
    </div>

    {#if cardType === 'shipper' && shipment.status == 'BOUGHT_NO_ADDRESS'}
      <div class="bg-yellow-40 border-l-4 border-yellow-400 p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg
              class="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-yellow-700">
              Carrier interested! Please set addresses to proceed.
            </p>
          </div>
        </div>
      </div>
    {/if}
  {/if}

  {#if isBoughtShipment(shipment)}
    <div class="space-y-2">
      <div class="flex justify-between">
        <span class="text-sm text-gray-500">Estimated Pickup</span>
        <span
          class={isToday(shipment.estimatedPickupDate) ? 'text-green-500' : ''}
        >
          {shipment.estimatedPickupDate?.toLocaleDateString() ??
            'Pending Route'}
        </span>
      </div>
      <div class="flex justify-between">
        <span class="text-sm text-gray-500">Estimated Delivery</span>
        <span
          class={isToday(shipment.estimatedDeliveryDate)
            ? 'text-green-500'
            : ''}
        >
          {shipment.estimatedDeliveryDate?.toLocaleDateString() ??
            'Pending Route'}
        </span>
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

  {@render children()}
</div>

<script lang="ts">
  import { authenticatedFetch } from '$src/lib/canisters';
  import { invalidateAll } from '$app/navigation';
  import type {
    AddressLocationResponse,
    PendingShipment,
  } from '$src/lib/extended.shipment';
  import { Marker } from 'svelte-maplibre';
  import Modal from './Modal.svelte';
  import { onMount } from 'svelte';

  interface AddressFormProps {
    shipmentId: string;
    showModal: boolean;
    onClose: () => void;
    onCoordinates: (e: {
      source: { lat: number; lng: number };
      destination: { lat: number; lng: number };
      isPreviewMode: boolean;
    }) => void;
    onAddressesSet: () => void;
  }

  let {
    shipmentId,
    showModal = $bindable(),
    onClose,
    onCoordinates,
    onAddressesSet,
  }: AddressFormProps = $props();

  async function fetchAddresses() {
    try {
      const response = await authenticatedFetch(
        `http://localhost:5000/shipments/${shipmentId}/addresses`,
        {
          method: 'GET',
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (!data) {
          hasAddresses = false;
          return;
        }
        hasAddresses = true;
        // Update source and destination with fetched data
        console.log(data);
        source = {
          ...source,
          street: data.pickup.address.street,
          city: data.pickup.address.city,
          zip: data.pickup.address.zip,
          lat: data.pickup.lat,
          lng: data.pickup.lng,
        };

        destination = {
          ...destination,
          street: data.delivery.address.street,
          city: data.delivery.address.city,
          zip: data.delivery.address.zip,
          lat: data.delivery.lat,
          lng: data.delivery.lng,
        };

        console.log(source, destination);
      } else {
        // const errorData = await response.json();
        // error = errorData.message || 'Failed to fetch addresses';
        hasAddresses = false;
      }
    } catch (e: any) {
      // error = e.message || 'Failed to fetch addresses';
      hasAddresses = false;
    }
  }

  // Watch for changes in showModal and shipment
  $effect(() => {
    if (showModal) {
      fetchAddresses();
    }
  });

  const PL_ZIP_PATTERN = '[0-9]{2}-[0-9]{3}';

  let source = $state({
    street: '',
    city: '',
    zip: '',
    country: '',
    lat: 52.237049,
    lng: 21.017532,
  });

  let destination = $state({
    street: '',
    city: '',
    zip: '',
    country: '',
    lat: 52.237049,
    lng: 21.017532,
  });

  let error: string | null = $state(null);
  let trackingInfo: { secret: string; trackingLink: string } | null =
    $state(null);
  let isPreviewMode = $state(false);
  let geocodedCalled = $state(false);
  let hasAddresses = $state(false);

  async function handleGeocode(e: Event) {
    e.preventDefault();
    error = null;

    try {
      const response = await authenticatedFetch(
        'http://localhost:5000/shipments/geocode',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pickupAddress: {
              street: source.street,
              city: source.city,
              zip: source.zip,
              country: 'PL',
            },
            deliveryAddress: {
              street: destination.street,
              city: destination.city,
              zip: destination.zip,
              country: 'PL',
            },
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        source = {
          ...source,
          lat: data.pickup.lat,
          lng: data.pickup.lng,
        };

        destination = {
          ...destination,
          lat: data.delivery.lat,
          lng: data.delivery.lng,
        };

        geocodedCalled = true;
        isPreviewMode = true;
        showModal = false;
      } else {
        const errorData = await response.json();
        error = errorData.message || 'Failed to geocode addresses';
      }
    } catch (e: any) {
      error = e.message || 'Failed to geocode addresses';
    }
  }

  function handleBackToForm() {
    isPreviewMode = false;
    showModal = true;
  }

  async function handleSaveAddresses() {
    error = null;

    try {
      const response = await authenticatedFetch(
        `http://localhost:5000/shipments/create`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            {
              shipmentId,
              pickupAddress: {
                street: source.street,
                city: source.city,
                zip: source.zip,
                country: 'PL',
                lat: source.lat,
                lng: source.lng,
              },
              deliveryAddress: {
                street: destination.street,
                city: destination.city,
                zip: destination.zip,
                country: 'PL',
                lat: destination.lat,
                lng: destination.lng,
              },
            },
            (_, v) => {
              return typeof v == 'bigint' ? v.toString() : v;
            },
          ),
        },
      );

      if (response.ok) {
        const data = await response.json();
        trackingInfo = {
          secret: data.trackingToken,
          trackingLink: `http://localhost:5173/track/${data.trackingToken}`,
        };

        onAddressesSet();
      } else {
        const errorData = await response.json();
        error = errorData.message || 'Failed to save addresses';
      }
    } catch (e: any) {
      error = e.message || 'Failed to save addresses';
    }
  }

  function modifyLocations() {
    isPreviewMode = true;
    showModal = false;
  }

  $inspect('source', source);
  $inspect('destination', destination);

  // Add effect to dispatch coordinates when they change
  $effect(() => {
    onCoordinates({
      source: { lat: source.lat, lng: source.lng },
      destination: { lat: destination.lat, lng: destination.lng },
      isPreviewMode,
    });
  });
</script>

<Modal
  bind:showModal
  onClose={() => {
    showModal = false;
  }}
>
  <div class="address-form p-6">
    <h1
      class="text-3xl text-center font-semibold inline-block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-8"
    >
      {#if isPreviewMode}
        Preview Locations
      {:else}
        Set Addresses
      {/if}
    </h1>

    {#if isPreviewMode}
      <div class="flex flex-col space-y-4">
        <div class="text-center">
          <p class="text-lg mb-2">Verify the locations on the map</p>
          <p class="text-sm text-gray-600">
            You can drag the markers to adjust the positions
          </p>
        </div>

        <div class="flex justify-between px-10 my-4">
          <div class="flex flex-col text-center space-y-2">
            <span class="font-semibold">Pickup Location</span>
            <span>{source.street}</span>
            <span>{source.city}, {source.zip}</span>
            <span class="text-sm"
              >{source.lat.toFixed(4)}, {source.lng.toFixed(4)}</span
            >
          </div>
          <div class="flex flex-col text-center space-y-2">
            <span class="font-semibold">Delivery Location</span>
            <span>{destination.street}</span>
            <span>{destination.city}, {destination.zip}</span>
            <span class="text-sm"
              >{destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}</span
            >
          </div>
        </div>

        <div class="flex justify-center space-x-4">
          <button
            type="button"
            onclick={handleBackToForm}
            class="bg-gray-500 rounded-full px-7 py-2 text-white text-base transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
          >
            Back to Form
          </button>
          <button
            type="button"
            onclick={handleSaveAddresses}
            class="bg-gradient-to-r from-blue-500 to-rose-400 rounded-full px-7 py-2 text-white text-base transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
          >
            Save Addresses
          </button>
        </div>
      </div>
    {:else}
      <form onsubmit={handleGeocode} class="flex flex-col space-y-6">
        <!-- Source Address -->
        <div class="space-y-4">
          <h2 class="text-xl font-semibold text-gray-700">Pickup Address</h2>
          <div class="form-group">
            <label for="source-street">Street Address</label>
            <input
              type="text"
              id="source-street"
              bind:value={source.street}
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="1234 Main St"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="form-group">
              <label for="source-city">City</label>
              <input
                type="text"
                id="source-city"
                bind:value={source.city}
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="City"
              />
            </div>
            <div class="form-group">
              <label for="source-zip">ZIP Code</label>
              <input
                type="text"
                id="source-zip"
                bind:value={source.zip}
                required
                pattern={PL_ZIP_PATTERN}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="ZIP"
              />
            </div>
          </div>

          <!-- Destination Address -->
          <div class="space-y-4 mt-6">
            <h2 class="text-xl font-semibold text-gray-700">
              Delivery Address
            </h2>
            <div class="form-group">
              <label for="dest-street">Street Address</label>
              <input
                type="text"
                id="dest-street"
                bind:value={destination.street}
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="1234 Main St"
              />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="form-group">
                <label for="dest-city">City</label>
                <input
                  type="text"
                  id="dest-city"
                  bind:value={destination.city}
                  required
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="City"
                />
              </div>

              <div class="form-group">
                <label for="dest-zip">ZIP Code</label>
                <input
                  type="text"
                  id="dest-zip"
                  bind:value={destination.zip}
                  required
                  pattern={PL_ZIP_PATTERN}
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="ZIP"
                />
              </div>
            </div>
          </div>

          {#if !geocodedCalled && !hasAddresses}
            <div class="text-center text-gray-600 my-8">
              No addresses set for this shipment yet.
            </div>
          {:else}
            <div class="flex justify-between px-10 my-8">
              <div class="flex flex-col text-center space-y-2">
                <span>Adjust pickup</span>

                <button
                  class="bg-gradient-to-r from-blue-500 to-rose-400 rounded-full px-4 py-1 mx-auto text-white transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
                  onclick={modifyLocations}
                  >{source.lat.toFixed(2)}, {source.lng.toFixed(2)}</button
                >
              </div>
              <div class="flex flex-col text-center space-y-2">
                <span>Adjust delivery</span>

                <button
                  class="bg-gradient-to-r from-blue-500 to-rose-400 rounded-full px-4 py-1 mx-auto text-white transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
                  onclick={modifyLocations}
                  >{destination.lat.toFixed(2)}, {destination.lng.toFixed(
                    2,
                  )}</button
                >
              </div>
            </div>
          {/if}
        </div>
        <button
          type="submit"
          class="bg-gradient-to-r from-blue-500 to-rose-400 rounded-full px-7 py-2 w-3/5 mx-auto text-white text-base transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
        >
          Preview
        </button>
      </form>
    {/if}

    {#if error}
      <div class="mt-4 p-4 bg-red-50 rounded-lg">
        <p class="text-red-700">{error}</p>
      </div>
    {/if}

    {#if trackingInfo}
      <div class="mt-4 p-4 bg-green-50 rounded-lg">
        <h3 class="text-lg font-semibold text-green-700">Addresses Saved!</h3>
        <p class="mt-2">Share this tracking link with the recipient:</p>
        <div class="mt-2 p-2 bg-white rounded border">
          <a
            href={trackingInfo.trackingLink}
            class="text-blue-500 hover:underline break-all"
          >
            {trackingInfo.trackingLink}
          </a>
        </div>
      </div>
    {/if}
  </div>
</Modal>

{#if isPreviewMode}
  <div
    class="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 z-10"
  >
    <div class="flex flex-col space-y-4">
      <div class="text-center">
        <p class="text-lg font-semibold">Preview Mode</p>
        <p class="text-sm text-gray-600">Drag markers to adjust positions</p>
      </div>

      <div class="flex justify-center space-x-4">
        <button
          type="button"
          onclick={handleBackToForm}
          class="bg-gray-500 rounded-full px-7 py-2 text-white text-base transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
        >
          Back to Form
        </button>
        <button
          type="button"
          onclick={handleSaveAddresses}
          class="bg-gradient-to-r from-blue-500 to-rose-400 rounded-full px-7 py-2 text-white text-base transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
        >
          Save Addresses
        </button>
      </div>
    </div>
  </div>
{/if}

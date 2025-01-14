<script lang="ts">
  import { authenticatedFetch } from '$src/lib/canisters';
  import { invalidateAll } from '$app/navigation';
  import { getLocalStorage, setLocalStorage } from '$src/lib/storage';
  import type { PendingShipment } from '$src/lib/extended.shipment';

  interface AddressFormProps {
    shipment: PendingShipment;
    showModal: boolean;
    onClose: () => void;
  }

  let {
    shipment,
    showModal = $bindable(),
    onClose,
  }: AddressFormProps = $props();

  let source = $state({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    // lat: shipment.info.source.lat,
    // lng: shipment.info.source.lng,
  });

  let destination = $state({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    // lat: shipment.info.destination.lat,
    // lng: shipment.info.destination.lng,
  });

  let error: string | null = $state(null);
  let trackingInfo: { secret: string; trackingLink: string } | null =
    $state(null);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = null;

    try {
      console.log(source, destination, shipment.id);
      const response = await authenticatedFetch(
        'http://localhost:5000/shipments/create',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            {
              shipmentId: shipment.id,
              pickupAddress: {
                street: source.street,
                city: source.city,
                state: source.state,
                zip: source.zip,
                country: source.country,
                // lat: source.lat,
                // lng: source.lng,
              },
              deliveryAddress: {
                street: destination.street,
                city: destination.city,
                state: destination.state,
                zip: destination.zip,
                country: destination.country,
                // lat: destination.lat,
                // lng: destination.lng,
              },
            },
            (_, v) => {
              return typeof v == 'bigint' ? Number(v) : v;
            },
          ),
        },
      );

      if (response.ok) {
        const data = await response.json();
        trackingInfo = data;
        // Save tracking info in localStorage with shipment ID as key
        setLocalStorage(
          `shipment_${shipment.id.toString()}_tracking`,
          JSON.stringify(data),
        );
        await invalidateAll();
        onClose();
      } else {
        const errorData = await response.json();
        error = errorData.message || 'Failed to create shipment';
      }
    } catch (e: any) {
      error = e.message || 'Failed to create shipment';
    }
  }
</script>

<div class="address-form p-6">
  <h1
    class="text-3xl text-center font-semibold inline-block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-8"
  >
    Set Addresses
  </h1>

  <form onsubmit={handleSubmit} class="flex flex-col space-y-6">
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
          <label for="source-state">State</label>
          <input
            type="text"
            id="source-state"
            bind:value={source.state}
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="State"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
          <label for="source-zip">ZIP Code</label>
          <input
            type="text"
            id="source-zip"
            bind:value={source.zip}
            required
            pattern="[0-9]*"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="ZIP"
          />
        </div>

        <div class="form-group">
          <label for="source-country">Country</label>
          <input
            type="text"
            id="source-country"
            bind:value={source.country}
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Country"
          />
        </div>
      </div>
    </div>

    <!-- Destination Address -->
    <div class="space-y-4 mt-6">
      <h2 class="text-xl font-semibold text-gray-700">Delivery Address</h2>
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
          <label for="dest-state">State</label>
          <input
            type="text"
            id="dest-state"
            bind:value={destination.state}
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="State"
          />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="form-group">
          <label for="dest-zip">ZIP Code</label>
          <input
            type="text"
            id="dest-zip"
            bind:value={destination.zip}
            required
            pattern="[0-9]*"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="ZIP"
          />
        </div>

        <div class="form-group">
          <label for="dest-country">Country</label>
          <input
            type="text"
            id="dest-country"
            bind:value={destination.country}
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Country"
          />
        </div>
      </div>
    </div>

    <button
      type="submit"
      class="bg-gradient-to-r from-blue-500 to-rose-400 rounded-full px-7 py-2 w-3/5 mx-auto text-white text-base transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
    >
      Save Addresses
    </button>
  </form>

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

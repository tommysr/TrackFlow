<script lang="ts">
  import { MapEvents, Marker } from 'svelte-maplibre';
  import DecimalInput from './DecimalInput.svelte';
  import TextInput from './TextInput.svelte';
  import Modal from './Modal.svelte';
  import { wallet } from '$src/lib/wallet.svelte';
  import { sha256 } from 'js-sha256';
  import { setLocalStorage } from '$src/lib/storage';

  interface ShipmentProps {
    showModal: boolean;
    onClose: () => void;
    onShipmentCreated: (id: string) => void;
  }

  let {
    showModal = $bindable(),
    onClose,
    onShipmentCreated,
  }: ShipmentProps = $props();

  let source = $state({ lat: 0, lng: 0, street: '' });
  let destination = $state({ lat: 0, lng: 0, street: '' });
  let value = $state(0);
  let size_category: 'Parcel' | 'Envelope' = $state('Envelope');
  let max_height = $state(0);
  let max_width = $state(0);
  let max_depth = $state(0);
  let price = $state(0);
  let name = $state('');
  let showMarkers = $state(true);

  let isSelectMode = $state(false);
  let selectModeType: 'source' | 'destination' = $state('source');
  let secretKey = $state('');
  let error: string | null = $state(null);

  let showSecretConfirmation = $state(false);
  let generatedSecret = $state('');
  let shipmentId = $state('');

  const generateRandomSecret = () => {
    const secret = crypto.getRandomValues(new Uint8Array(32));
    const secretHex = Array.from(secret)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    return secretHex;
  };

  const continueWithShipment = () => {
    setLocalStorage(shipmentId.toString(), generatedSecret);
    isSelectMode = false;
    showMarkers = false;
    showSecretConfirmation = false;
    showModal = false;
    onShipmentCreated(shipmentId.toString());
  };

  const createShipment = async (e: Event) => {
    e.preventDefault();
    error = null;

    if (!$wallet.connected) await wallet.connect();
    if (!$wallet.connected) return;

    try {
      const priceBigint = BigInt(price);
      const secret = generateRandomSecret();
      generatedSecret = secret;
      const hash = sha256.create();
      hash.update(secret);
      const hashed = hash.hex();

      const res = await $wallet.actor.createShipment('', name, hashed, {
        size_category:
          size_category == 'Parcel'
            ? {
                Parcel: {
                  max_height: BigInt(max_height),
                  max_width: BigInt(max_width),
                  max_depth: BigInt(max_depth),
                },
              }
            : { Envelope: null },
        destination,
        source,
        price: priceBigint,
        value: BigInt(value),
      });

      if (Object.keys(res)[0] === 'Ok') {
        const id = (res as { Ok: bigint }).Ok;
        shipmentId = id.toString();
        showSecretConfirmation = true;
      } else {
        console.error('Failed to create shipment', res);
        return;
      }

      console.log('createShipment', res);
    } catch (e: any) {
      error = e.message || 'Failed to create shipment';
    }
  };

  function getLocation(e: CustomEvent<maplibregl.MapMouseEvent>) {
    const { lng, lat } = e.detail.lngLat;
    const street = 'Some street';
    if (selectModeType === 'source') {
      source = { lat, lng, street };
    } else {
      destination = { lat, lng, street };
    }
    isSelectMode = false;
    showModal = true;
  }

  function selectSource() {
    isSelectMode = true;
    showModal = false;
    selectModeType = 'source';
  }

  function selectDestination() {
    isSelectMode = true;
    showModal = false;
    selectModeType = 'destination';
  }

  function clearData() {
    source = { lat: 0, lng: 0, street: '' };
    destination = { lat: 0, lng: 0, street: '' };
    value = 0;
    size_category = 'Parcel';
    max_height = 0;
    max_width = 0;
    max_depth = 0;
    price = 0;
    name = '';
  }
</script>

{#if isSelectMode}
  <MapEvents on:click={getLocation} />
{:else}
  <Modal
    bind:showModal
    onClose={() => {
      onClose();
      clearData();
    }}
  >
    <form
      method="POST"
      class="flex flex-col space-y-7 w-full"
      onsubmit={createShipment}
    >
      <h1
        class="text-3xl text-center font-semibold inline-block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-5"
      >
        Create shipment
      </h1>

      <TextInput
        label="Name"
        id="name"
        name="name"
        bind:value={name}
        required
      />
      <DecimalInput label="Value" id="value" name="value" bind:value required />
      <DecimalInput
        label="Price"
        id="price"
        name="price"
        bind:value={price}
        required
      />

      <div class="flex justify-between px-10 my-8">
        <div class="flex flex-col text-center space-y-2">
          <span>Source</span>
          {#if !source.street}
            <button
              class="bg-gradient-to-r from-blue-500 to-rose-400 rounded-full px-4 py-1 mx-auto text-white transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
              onclick={selectSource}>Select location</button
            >
          {:else}
            <button onclick={selectSource} class="text-lg"
              >{source.lat.toFixed(2)}, {source.lng.toFixed(2)}</button
            >
          {/if}
        </div>
        <div class="flex flex-col text-center space-y-2">
          <span>Destination</span>
          {#if !destination.street}
            <button
              class="bg-gradient-to-r from-blue-500 to-rose-400 rounded-full px-4 py-1 mx-auto text-white transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
              onclick={selectDestination}>Select location</button
            >
          {:else}
            <button onclick={selectDestination} class="text-lg"
              >{destination.lat.toFixed(2)}, {destination.lng.toFixed(
                2,
              )}</button
            >
          {/if}
        </div>
      </div>

      <div class="flex flex-col">
        <label for="size_category" class="ml-1.5">Size Category</label>
        <div
          class="rounded-lg border-2 border-gradient-to-r from-primary to-secondary"
        >
          <select
            id="size_category"
            name="size_category"
            bind:value={size_category}
            class="w-full rounded-3xl bg-transparent text-neutral-600 font-normal focus:outline-none px-4 py-2.5 text-base"
          >
            <option value="Parcel">Parcel</option>
            <option value="Envelope">Envelope</option>
          </select>
        </div>
      </div>

      {#if size_category === 'Parcel'}
        <DecimalInput
          label="Height"
          id="max_height"
          name="max_height"
          bind:value={max_height}
          required
        />
        <DecimalInput
          label="Width"
          id="max_width"
          name="max_width"
          bind:value={max_width}
          required
        />
        <DecimalInput
          label="Depth"
          id="max_depth"
          name="max_depth"
          bind:value={max_depth}
          required
        />
      {/if}

      <button
        type="submit"
        class="bg-gradient-to-r from-blue-500 to-rose-400 rounded-full px-7 py-2 w-3/5 mx-auto text-white text-base transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
        >Create & Continue</button
      >
    </form>
  </Modal>
{/if}

{#if source.street && (isSelectMode || showModal) && showMarkers}
  <Marker lngLat={[source.lng, source.lat]}>
    <div class="relative pin bounce-a cursor-pointer active"></div>
  </Marker>
{/if}

{#if destination.street && (isSelectMode || showModal) && showMarkers}
  <Marker lngLat={[destination.lng, destination.lat]}>
    <div class="pin bounce-a cursor-pointer active"></div>
  </Marker>
{/if}

{#if showSecretConfirmation}
  <Modal showModal={true} onClose={() => {}}>
    <div class="flex flex-col space-y-4 items-center">
      <h2 class="text-2xl font-semibold text-center">Important: Save Your Secret</h2>
      <p class="text-center text-gray-600">Please copy and save this secret. You'll need it to track your shipment:</p>
      <div class="flex items-center gap-2">
        <input
          type="text"
          value={generatedSecret}
          class="w-full px-3 py-2 border rounded-md"
          placeholder="Enter delivery secret key"
          id="secretKey"
          readonly
        />
        <button
          class="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          onclick={() => {
            navigator.clipboard.writeText(secretKey);
          }}
        >
          Copy
        </button>
      </div>
      <button
        class="bg-gradient-to-r from-blue-500 to-rose-400 rounded-full px-7 py-2 w-3/5 mx-auto text-white text-base transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
        onclick={continueWithShipment}
      >
        I've saved the secret, continue
      </button>
    </div>
  </Modal>
{/if}

{#if error}
  <div class="mt-4 p-4 bg-red-50 rounded-lg">
    <p class="text-red-700">{error}</p>
  </div>
{/if}

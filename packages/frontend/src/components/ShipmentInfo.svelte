<script lang="ts">
	import type { Shipment } from '../../../declarations/canister/canister.did';

	let { shipment }: { shipment: Shipment } = $props();
	let parcel = $derived(Object.values(shipment.info.size_category)[0]);
</script>

<div class="flex flex-col items-center space-y-7 w-full mb-12">
	<h1
		class="text-3xl text-center font-semibold inline-block bg-gradient-to-r from-blue-500 to-rose-400 bg-clip-text text-transparent mb-5"
	>
		Shipment info
	</h1>

	<div class="grid grid-cols-2 gap-x-20 gap-y-7">
		<div class="text-center flex flex-col space-y-3 col-span-2">
			<span class="text-lg font-semibold text-rose-500">Name</span>
			<span class="text-base">{shipment.name}</span>
		</div>

		<div class="text-center flex flex-col space-y-3">
			<span class="text-lg font-semibold text-rose-500">Price</span>
			<span class="text-base">{shipment.info.price}</span>
		</div>

		<div class="text-center flex flex-col space-y-3">
			<span class="text-xl font-semibold text-rose-500">Value</span>
			<span class="text-base">{shipment.info.value}</span>
		</div>

		<div class="text-center flex flex-col space-y-3">
			<span class="text-lg font-semibold text-rose-500">Source</span>
			<span class="text-base"
				>{shipment.info.source.lat.toFixed(2)}, {shipment.info.destination.lng.toFixed(2)}</span
			>
		</div>

		<div class="text-center flex flex-col space-y-3">
			<span class="text-lg font-semibold text-rose-500">Destination</span>
			<span class="text-base"
				>{shipment.info.destination.lat.toFixed(2)}, {shipment.info.destination.lng.toFixed(
					2
				)}</span
			>
		</div>

		<div class="text-center flex flex-col space-y-3 col-span-2">
			<div class="text-center flex flex-col space-y-3">
				<span class="text-lg font-semibold text-rose-500">Size category</span>
				<span class="text-base">{Object.keys(shipment.info.size_category)[0]}</span>
			</div>
		</div>

		{#if Object.keys(shipment.info.size_category)[0] == 'Parcel' && parcel}
			<div class="grid grid-cols-3 col-span-2">
				<div class="text-center flex flex-col space-y-3">
					<span class="text-lg font-semibold text-rose-500">Width</span>
					<span class="text-base">{parcel.max_width}</span>
				</div>

				<div class="text-center flex flex-col space-y-3">
					<span class="text-lg font-semibold text-rose-500">Height</span>
					<span class="text-base">{parcel.max_height}</span>
				</div>

				<div class="text-center flex flex-col space-y-3">
					<span class="text-lg font-semibold text-rose-500">Depth</span>
					<span class="text-base">{parcel.max_depth}</span>
				</div>
			</div>
		{/if}
	</div>
</div>
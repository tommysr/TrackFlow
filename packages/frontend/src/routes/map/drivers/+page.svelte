<script lang="ts">
  import ListWrapper from '$components/ListWrapper.svelte';
  import ShipmentCard from '$components/ShipmentCard.svelte';
  import clsx from 'clsx';
  import { authenticatedFetch } from '$src/lib/canisters';
  import type { PageData } from './$types';
  import {
    RouteOperationType,
    type BoughtShipment,
    type ShipmentRouteOperation,
  } from '$src/lib/extended.shipment';
  import RoutePreview from '$components/RoutePreview.svelte';
  import Marker from '$components/Marker.svelte';
  import type { MapContext } from 'svelte-maplibre/dist/context';
  import { getContext, onDestroy } from 'svelte';
  import { formatDistance, formatDuration, formatDateTime } from '$lib/format';
  import { RouteStatus, type Route } from './types';
  import ActiveRoute from '$components/ActiveRoute.svelte';
  import { locationTracking } from '$src/lib/stores/locationTracking.svelte';
  import { addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
  import { untrack } from 'svelte';
    import { invalidateAll } from '$app/navigation';

  let { data }: { data: PageData } = $props();

  let isMobileOpen = $state(false);
  let isWalletConnected = $state(true);
  let selectedNav = $state(0);
  let selectedShipments = $state<Set<string>>(new Set());
  let selectedRoute = $state<Route | null>(null);
  let isCreatingRoute = $state(false);
  let routePreview = $state(null);
  let routes: Route[] = $state([]);
  let activeRoute: Route | null = $state(null);
  let routesLoading = $state(false);
  let startLocation = $state<{ lat: number; lng: number } | null>(null);
  let endLocation = $state<{ lat: number; lng: number } | null>(null);
  let isSettingStartLocation = $state(false);
  let isSettingEndLocation = $state(false);
  let currentStep = $state<'start' | 'end' | 'schedule' | 'preview'>('start');
  let stepError = $state<string | null>(null);

  let shipmentOperations = $state<Map<string, RouteOperationType>>(new Map());
  let scheduledDate = $state<string>(
    new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16),
  );

  // Add this state to track valid operations for each shipment
  let validOperationsMap = $state<
    Map<string, { pickup: boolean; delivery: boolean; both: boolean }>
  >(new Map());

  const categories: {
    name: string;
    data: BoughtShipment[];
    type: 'available' | 'active' | 'statistics' | 'routes';
  }[] = [
    {
      name: 'Available',
      data: data.boughtShipments, // Will contain shipments with BOUGHT_WITH_ADDRESS or BOUGHT_NO_ADDRESS status
      type: 'available',
    },
    {
      name: 'Active',
      data: [],
      type: 'active',
    },
    {
      name: 'Routes',
      data: [],
      type: 'routes',
    },
    { name: 'Statistics', data: [], type: 'statistics' },
  ];

  let store = getContext<MapContext>(Symbol.for('svelte-maplibre')).map;
  let map = $derived<maplibregl.Map | null>($store);
  let currentZoom = $state(0);

  const handleZoom = () => {
    if (map) {
      currentZoom = map.getZoom();
    }
  };

  // Add zoom change handler
  $effect(() => {
    if (map) {
      currentZoom = map.getZoom();
      map.on('zoomend', handleZoom);
      return () => {
        map.off('zoomend', handleZoom);
      };
    }
  });

  $inspect(validOperationsMap);

  async function toggleShipmentSelection(shipmentId: string) {
    if (selectedShipments.has(shipmentId)) {
      selectedShipments.delete(shipmentId);
      shipmentOperations.delete(shipmentId);
    } else {
      selectedShipments.add(shipmentId);
      shipmentOperations.set(shipmentId, RouteOperationType.BOTH);
    }
    selectedShipments = new Set(selectedShipments);
    shipmentOperations = new Map(shipmentOperations);

    if (selectedShipments.size === 0) {
      clearLocations();
      currentStep = 'start';
      stepError = null;
      routePreview = null;
    }
  }

  function handleMapClick(e: { lngLat: { lat: number; lng: number } }) {
    if (isSettingStartLocation) {
      startLocation = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      isSettingStartLocation = false;
    } else if (isSettingEndLocation) {
      endLocation = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      isSettingEndLocation = false;
    }
  }

  $effect(() => {
    if (map) {
      map.on('click', handleMapClick);
      return () => {
        map.off('click', handleMapClick);
      };
    }
  });

  function validateTimeWindows(
    shipments: BoughtShipment[],
    startTime: Date,
  ): boolean {
    const routeDay = startOfDay(startTime);
    console.log(routeDay);
    return shipments.every((shipment) => {
      if (!shipment.pickupTimeWindow || !shipment.deliveryTimeWindow)
        return false;

      const pickupStart = new Date(shipment.pickupTimeWindow.start);
      const pickupEnd = new Date(shipment.pickupTimeWindow.end);
      const deliveryStart = new Date(shipment.deliveryTimeWindow.start);
      const deliveryEnd = new Date(shipment.deliveryTimeWindow.end);

      console.log(pickupStart, pickupEnd, deliveryStart, deliveryEnd);

      // Check if route day falls within the windows
      const isValidPickup = isWithinInterval(routeDay, {
        start: startOfDay(pickupStart),
        end: endOfDay(pickupEnd),
      });

      const isValidDelivery = isWithinInterval(routeDay, {
        start: startOfDay(deliveryStart),
        end: endOfDay(deliveryEnd),
      });
      const selectedOperationType = shipmentOperations.get(
        shipment.id.toString(),
      );
      return (
        (selectedOperationType === RouteOperationType.PICKUP &&
          isValidPickup) ||
        (selectedOperationType === RouteOperationType.DELIVERY &&
          isValidDelivery) ||
        (selectedOperationType === RouteOperationType.BOTH &&
          isValidPickup &&
          isValidDelivery)
      );
    });
  }

  async function previewRoute() {
    stepError = null;

    // Validate time windows
    const selectedShipmentsList = categories[selectedNav].data.filter((s) =>
      selectedShipments.has(String(s.id)),
    );

    if (!validateTimeWindows(selectedShipmentsList, new Date(scheduledDate))) {
      stepError =
        "Route day must fall within all selected shipments' time windows";
      return;
    }

    isCreatingRoute = true;
    try {
      const shipmentOperationsMapped: ShipmentRouteOperation[] = Array.from(
        selectedShipments,
      ).map(
        (id) =>
          ({
            id,
            type: shipmentOperations.get(id) || RouteOperationType.BOTH,
          }) as ShipmentRouteOperation,
      );

      const response = await authenticatedFetch(
        'http://localhost:5000/routes/simulate',
        {
          method: 'POST',
          body: JSON.stringify({
            shipments: shipmentOperationsMapped,
            estimatedStartTime: scheduledDate,
            startLocation: startLocation,
            ...(endLocation && { endLocation }),
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to simulate route');
      }

      routePreview = await response.json();
    } catch (error) {
      console.error('Failed to preview route:', error);
    } finally {
      isCreatingRoute = false;
    }
  }

  async function createRoute() {
    try {
      if (!startLocation) {
        stepError = 'Please set a start location first';
        return;
      }

      const scheduledTime = new Date(scheduledDate);
      if (isNaN(scheduledTime.getTime())) {
        stepError = 'Please set a valid start time';
        return;
      }

      if (scheduledTime < new Date()) {
        stepError = 'Start time must be in the future';
        return;
      }

      stepError = null;
      // Validate time windows
      const selectedShipmentsList = categories[selectedNav].data.filter((s) =>
        selectedShipments.has(String(s.id)),
      );

      if (
        !validateTimeWindows(selectedShipmentsList, new Date(scheduledDate))
      ) {
        stepError =
          "Route day must fall within all selected shipments' time windows";
        return;
      }

      const response = await authenticatedFetch(
        'http://localhost:5000/routes',
        {
          method: 'POST',
          body: JSON.stringify({
            shipments: Array.from(selectedShipments).map((id) => ({
              id,
              type: shipmentOperations.get(id),
            })),
            estimatedStartTime: scheduledDate,
            startLocation,
            ...(endLocation && {
              endLocation,
            }),
          }),
        },
      );

      if (!response.ok) {
        throw new Error('Failed to create route');
      }

      invalidateAll();

      // Clear selection and preview
      selectedShipments = new Set();
      routePreview = null;

      // Could add success notification here

      // Refresh data (you might want to implement this)
      // await refreshData();
    } catch (error) {
      console.error('Failed to create route:', error);
      stepError =
        error instanceof Error ? error.message : 'Failed to create route';
      throw error; // Let RoutePreview component handle the error
    }
  }

  function handleBack() {
    routePreview = null;
  }

  async function handleCreateRoute() {
    await createRoute();
  }

  async function loadRoutes() {
    routesLoading = true;
    try {
      // Load all routes and active route in parallel
      const routesResponse = await authenticatedFetch('http://localhost:5000/routes');

      try {
        const activeRouteResponse = await authenticatedFetch('http://localhost:5000/routes/active');
        activeRoute = await activeRouteResponse.json();
      } catch (error) {
        console.error('Failed to load active route:', error);
        activeRoute = null;
      }

      if (!routesResponse.ok) throw new Error('Failed to load routes');
      const routesData: Route[] = await routesResponse.json();

      // Filter out active route from general routes list
      routes = routesData.filter((r) => r.status !== 'active');

    } catch (error) {
      console.error('Failed to load routes:', error);
    } finally {
      routesLoading = false;
    }
  }

  async function deleteRoute(id: string) {
    try {
      await authenticatedFetch(`http://localhost:5000/routes/${id}`, {
        method: 'DELETE',
      });
      routes = routes.filter((route) => route.id !== id);
    } catch (error) {
      console.error('Failed to delete route:', error);
    }
  }

  async function activateRoute(id: string) {
    try {
      const response = await authenticatedFetch(
        `http://localhost:5000/routes/${id}/activate`,
        {
          method: 'POST',
        },
      );

      if (response.ok) {
        // Start location tracking when route is activated
        locationTracking.startTracking();
        await loadRoutes();
      }
    } catch (error) {
      console.error('Failed to activate route:', error);
    }
  }

  function clearLocations() {
    startLocation = null;
    endLocation = null;
    isSettingStartLocation = false;
    isSettingEndLocation = false;
  }

  // $inspect(selectedShipments);
  // $inspect(currentZoom);
  $inspect(categories[selectedNav].data);
  $effect(() => {
    if (selectedNav === 1) {
      // Routes tab
      loadRoutes();
    }
  });

  function nextStep() {
    stepError = null;

    // Validate current step before proceeding
    if (currentStep === 'start') {
      if (!startLocation) {
        stepError = 'Please set a start location first';
        return;
      }
      currentStep = 'end';
    } else if (currentStep === 'end') {
      currentStep = 'schedule';
    } else if (currentStep === 'schedule') {
      const scheduledTime = new Date(scheduledDate);
      if (isNaN(scheduledTime.getTime())) {
        stepError = 'Please set a valid start time';
        return;
      }

      if (scheduledTime < new Date()) {
        stepError = 'Start time must be in the future';
        return;
      }
      currentStep = 'preview';
      // Automatically trigger preview when reaching the preview step
      previewRoute();
    }
  }

  function deleteLocation(type: 'start' | 'end') {
    if (type === 'start') {
      startLocation = null;
    } else {
      endLocation = null;
    }
  }

  function prevStep() {
    stepError = null;
    if (currentStep === 'preview') {
      currentStep = 'schedule';
    } else if (currentStep === 'schedule') {
      currentStep = 'end';
    } else if (currentStep === 'end') {
      currentStep = 'start';
    }
  }

  // Stop tracking when leaving the page or deactivating route
  onDestroy(() => {
    locationTracking.stopTracking();
  });

  // Add this helper function
  function getValidOperations(shipment: BoughtShipment, routeDay: Date) {
    console.log(routeDay);
    if (!shipment.pickupTimeWindow || !shipment.deliveryTimeWindow) {
      return { pickup: false, delivery: false, both: false };
    }

    const pickupStart = new Date(shipment.pickupTimeWindow.start);
    const pickupEnd = new Date(shipment.pickupTimeWindow.end);
    const deliveryStart = new Date(shipment.deliveryTimeWindow.start);
    const deliveryEnd = new Date(shipment.deliveryTimeWindow.end);

    const isValidPickup = isWithinInterval(routeDay, {
      start: startOfDay(pickupStart),
      end: endOfDay(pickupEnd),
    });

    const isValidDelivery = isWithinInterval(routeDay, {
      start: startOfDay(deliveryStart),
      end: endOfDay(deliveryEnd),
    });

    return {
      pickup: isValidPickup,
      delivery: isValidDelivery,
      both: isValidPickup && isValidDelivery,
    };
  }

  // Remove the regular effect and replace with this:
  $effect.root(() => {
    // Initial setup of validOperationsMap
    function updateValidOperations() {
      if (!scheduledDate) return;
      console.log(scheduledDate);
      const routeDay = startOfDay(new Date(scheduledDate));
      const newValidOps = new Map();
      const newShipmentOps = new Map(shipmentOperations);

      const newSelectedShipments = new Set(selectedShipments);
      let hasChanges = false;

      console.log(newValidOps);
      console.log(newShipmentOps);
      console.log(newSelectedShipments);
      console.log(hasChanges);

      untrack(() => {
        categories[selectedNav].data.forEach((shipment) => {
          const id = String(shipment.id);
          newValidOps.set(id, getValidOperations(shipment, routeDay));
        });

        // Update operations only if they're invalid
        for (const [id, ops] of newShipmentOps) {
          const validOps = newValidOps.get(id);
          if (validOps && !validOps[ops]) {
            const newType = validOps.both
              ? RouteOperationType.BOTH
              : validOps.pickup
                ? RouteOperationType.PICKUP
                : validOps.delivery
                  ? RouteOperationType.DELIVERY
                  : null;

            if (newType) {
              newShipmentOps.set(id, newType);
            } else {
              newShipmentOps.delete(id);
              newSelectedShipments.delete(id);
            }
            hasChanges = true;
          }
        }
      });

      validOperationsMap = newValidOps;
      if (hasChanges) {
        shipmentOperations = newShipmentOps;
        selectedShipments = newSelectedShipments;
      }
    }

    // Create effect to watch scheduledDate changes
    $effect(() => {
      updateValidOperations();
    });

    // Return cleanup function
    return () => {
      validOperationsMap = new Map();
      shipmentOperations = new Map();
      selectedShipments = new Set();
    };
  });
</script>

<svelte:head>
  <title>Drivers</title>
  <meta name="description" content="Svelte demo app" />
</svelte:head>

<ListWrapper bind:isMobileOpen>
  {#if !isWalletConnected}
    <div class="w-full flex justify-center items-center">
      <p
        class="text-center text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent w-2/3"
      >
        Connect your wallet to view shipments
      </p>
    </div>
  {:else}
    <div class="h-full flex w-full flex-col items-center">
      <div class="inline-flex shadow-sm rounded-lg m-4 flex-none">
        {#each categories as { name }, i}
          <button
            class={clsx(
              'px-4 py-2 text-md font-semibold',
              selectedNav == i
                ? 'bg-gradient-to-r from-primary-400 to-secondary-400 text-white'
                : 'bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent',
              i == 0 && 'rounded-l-lg',
              i == categories.length - 1 && 'rounded-r-lg',
            )}
            onclick={() => (selectedNav = i)}
          >
            {name}
          </button>
        {/each}
      </div>

      {#if selectedNav === 0}
        {#if selectedShipments.size > 0}
          <div class="w-full px-2 py-1 flex flex-col gap-1">
            <div class="relative flex flex-col gap-2">
              <div
                class="flex items-center justify-between text-xs text-gray-500 mb-1 pl-3 pr-3"
              >
                <div class="flex flex-row gap-1">
                  <div>
                    Step {currentStep === 'start'
                      ? '1'
                      : currentStep === 'end'
                        ? '2'
                        : currentStep === 'schedule'
                          ? '3'
                          : '4'} of 4:
                    {#if currentStep === 'start'}
                      Select start location
                    {:else if currentStep === 'end'}
                      Select end location (optional)
                    {:else if currentStep === 'schedule'}
                      Schedule route start time
                    {:else}
                      Preview route
                    {/if}
                  </div>
                  {#if stepError}
                    <div class="ml-2 text-red-500 font-medium text-bold">
                      {stepError}
                    </div>
                  {/if}
                </div>
                {#if currentStep !== 'start'}
                  <button
                    class="text-blue-500 hover:text-blue-600"
                    onclick={() => prevStep()}
                  >
                    Back
                  </button>
                {/if}
              </div>

              <div class="flex flex-wrap items-center gap-2 pl-3 pr-3">
                {#if currentStep === 'start'}
                  <div class="flex items-center gap-2">
                    <button
                      class="px-2.5 py-2 text-xs rounded-full {startLocation
                        ? 'bg-green-500'
                        : 'bg-blue-500'} text-white hover:opacity-90 transition-opacity relative group"
                      onclick={() => {
                        isSettingStartLocation = !isSettingStartLocation;
                        isSettingEndLocation = false;
                      }}
                    >
                      {startLocation ? 'Change Start' : 'Set Start Location'}
                      {#if isSettingStartLocation}
                        <div
                          class="absolute left-1/2 -translate-x-1/2 -bottom-6 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
                        >
                          Click on map to set location
                        </div>
                      {/if}
                    </button>

                    {#if startLocation}
                      <button
                        class="px-2.5 py-2 text-xs rounded-full bg-red-500 text-white hover:opacity-90 transition-opacity"
                        onclick={() => deleteLocation('start')}
                      >
                        Delete
                      </button>
                    {/if}

                    {#if startLocation}
                      <button
                        class="px-2.5 py-2 text-xs rounded-full bg-blue-500 text-white hover:opacity-90 transition-opacity"
                        onclick={() => nextStep()}
                      >
                        Next
                      </button>
                    {/if}
                  </div>
                {:else if currentStep === 'end'}
                  <div class="flex items-center gap-2">
                    <button
                      class="px-2.5 py-2 text-xs rounded-full {endLocation
                        ? 'bg-green-500'
                        : 'bg-blue-500'} text-white hover:opacity-90 transition-opacity relative group"
                      onclick={() => {
                        isSettingEndLocation = !isSettingEndLocation;
                        isSettingStartLocation = false;
                      }}
                    >
                      {endLocation ? 'Change End' : 'Set End Location'}
                      {#if isSettingEndLocation}
                        <div
                          class="absolute left-1/2 -translate-x-1/2 -bottom-6 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
                        >
                          Click on map to set location
                        </div>
                      {/if}
                    </button>

                    {#if endLocation}
                      <button
                        class="px-2.5 py-2 text-xs rounded-full bg-red-500 text-white hover:opacity-90 transition-opacity"
                        onclick={() => deleteLocation('end')}
                      >
                        Delete
                      </button>
                    {/if}

                    <button
                      class="px-2.5 py-2 text-xs rounded-full bg-blue-500 text-white hover:opacity-90 transition-opacity"
                      onclick={() => nextStep()}
                    >
                      {endLocation ? 'Next' : 'Skip'}
                    </button>
                  </div>
                {:else if currentStep === 'schedule'}
                  <div class="flex items-center gap-4 mb-2">
                    <button
                      class="px-2.5 py-2 text-xs rounded-full bg-blue-500 text-white hover:opacity-90 transition-opacity"
                      onclick={() => nextStep()}
                    >
                      Next
                    </button>
                  </div>
                {:else}
                  <div class="flex items-center gap-2">
                    <button
                      class="px-2.5 py-2 text-xs rounded-full bg-blue-500 text-white hover:opacity-90 transition-colors"
                      onclick={previewRoute}
                      disabled={isCreatingRoute}
                    >
                      Preview Route
                    </button>
                  </div>
                {/if}
              </div>
            </div>
          </div>

          {#if routePreview}
            <RoutePreview
              {routePreview}
              onBack={handleBack}
              onCreate={handleCreateRoute}
            />
          {/if}
        {/if}

        {#if categories[selectedNav].data.length > 0}
          <div class="w-full px-4 py-2">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500">Route Date:</span>
              <input
                type="datetime-local"
                class="px-2 py-1 text-xs border rounded bg-white"
                min={new Date().toISOString().slice(0, 16)}
                bind:value={scheduledDate}
              />
            </div>
          </div>

          <div class="flex-1 flex w-full flex-col overflow-y-auto px-4 pt-5">
            <ul class="w-full flex-1 space-y-4">
              {#each categories[selectedNav].data as shipment}
                <li>
                  <ShipmentCard
                    cardType="driver"
                    {shipment}
                    selectable={true}
                    selected={selectedShipments.has(String(shipment.id))}
                    onSelect={() =>
                      toggleShipmentSelection(String(shipment.id))}
                  >
                    <div class="mt-2 space-y-2 text-sm">
                      {#if shipment.pickupTimeWindow}
                        <div class="flex flex-col">
                          <span class="text-gray-500">Pickup Window:</span>
                          <span>
                            {new Date(
                              shipment.pickupTimeWindow.start,
                            ).toLocaleDateString()} -
                            {new Date(
                              shipment.pickupTimeWindow.end,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      {/if}
                      {#if shipment.deliveryTimeWindow}
                        <div class="flex flex-col">
                          <span class="text-gray-500">Delivery Window:</span>
                          <span>
                            {new Date(
                              shipment.deliveryTimeWindow.start,
                            ).toLocaleDateString()} -
                            {new Date(
                              shipment.deliveryTimeWindow.end,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      {/if}

                      {#if selectedShipments.has(String(shipment.id))}
                        {@const routeDay = startOfDay(new Date(scheduledDate))}
                        {@const validOps = validOperationsMap.get(
                          String(shipment.id),
                        ) ?? { pickup: true, delivery: true, both: true }}
                        <div class="mt-2">
                          <select
                            class={clsx(
                              'w-full px-2 py-1 text-xs border rounded',
                              'focus:outline-none focus:ring-2',
                              !validOps.pickup &&
                                !validOps.delivery &&
                                !validOps.both
                                ? 'bg-red-50 border-red-300'
                                : 'bg-white border-gray-300',
                            )}
                            value={shipmentOperations.get(String(shipment.id))}
                            onclick={(e) => e.stopPropagation()}
                            onchange={(e) => {
                              e.stopPropagation();
                              if (e.target instanceof HTMLSelectElement) {
                                const selectedOperationType = e.target
                                  .value as RouteOperationType;
                                shipmentOperations.set(
                                  String(shipment.id),
                                  selectedOperationType,
                                );
                                shipmentOperations = new Map(
                                  shipmentOperations,
                                );
                              }
                            }}
                          >
                            <option
                              value={RouteOperationType.BOTH}
                              disabled={!validOps.both}
                              class={clsx(
                                !validOps.both && 'text-red-500 bg-red-50',
                                validOps.both && 'text-green-700 bg-green-50',
                              )}
                            >
                              Both Pickup & Delivery {!validOps.both
                                ? '❌'
                                : '✓'}
                            </option>
                            <option
                              value={RouteOperationType.PICKUP}
                              disabled={!validOps.pickup}
                              class={clsx(
                                !validOps.pickup && 'text-red-500 bg-red-50',
                                validOps.pickup && 'text-green-700 bg-green-50',
                              )}
                            >
                              Pickup Only {!validOps.pickup ? '❌' : '✓'}
                            </option>
                            <option
                              value={RouteOperationType.DELIVERY}
                              disabled={!validOps.delivery}
                              class={clsx(
                                !validOps.delivery && 'text-red-500 bg-red-50',
                                validOps.delivery &&
                                  'text-green-700 bg-green-50',
                              )}
                            >
                              Delivery Only {!validOps.delivery ? '❌' : '✓'}
                            </option>
                          </select>

                          <!-- Add a helper text to show validation status -->
                          {#if !validOps.pickup && !validOps.delivery && !validOps.both}
                            <p class="mt-1 text-xs text-red-500">
                              No valid operations for selected date
                            </p>
                          {/if}
                        </div>
                      {/if}
                    </div>
                  </ShipmentCard>
                </li>
              {/each}
            </ul>
          </div>
        {:else}
          <div class="flex-1 flex items-center">
            <p
              class="mb-5 text-center text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
            >
              No shipments found
            </p>
          </div>
        {/if}
      {:else if selectedNav === 1}
        {#if routesLoading}
          <div class="flex-1 flex items-center justify-center">
            <div class="text-center">Loading routes...</div>
          </div>
        {:else if activeRoute}
          <ActiveRoute route={activeRoute} />
        {:else if routes.length === 0}
          <div class="flex-1 flex items-center">
            <p
              class="mb-5 text-center text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
            >
              No routes found
            </p>
          </div>
        {:else}
          <div
            class="flex-1 flex w-full flex-col overflow-y-auto px-4 py-2 space-y-4"
          >
            {#each routes as route}
              <div class="border rounded-lg p-4 shadow-sm">
                <div class="flex justify-between items-start">
                  <div>
                    <div class="font-semibold">
                      Route #{route.id.slice(0, 8)}
                      <span
                        class="ml-2 px-2 py-1 text-sm rounded-full {route.status ===
                        RouteStatus.PENDING
                          ? 'bg-yellow-100 text-yellow-800'
                          : route.status === RouteStatus.COMPLETED
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'}"
                      >
                        {route.status}
                      </span>
                    </div>

                    <div class="mt-2 text-sm text-gray-600">
                      <div>
                        Distance: {formatDistance(route.totalDistance)}
                      </div>
                      <div>
                        Duration: {formatDuration(route.estimatedTime)}
                      </div>
                      <div>Scheduled: {formatDateTime(route.date)}</div>
                      <div>
                        Stops: {route.metrics?.progress?.totalStops || 0}
                      </div>
                    </div>
                  </div>

                  <div class="flex gap-2">
                    {#if route.status === 'pending'}
                      <button
                        class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                        onclick={() => activateRoute(route.id)}
                      >
                        Activate
                      </button>
                    {/if}

                    <button
                      class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      onclick={() => (selectedRoute = route)}
                    >
                      Details
                    </button>

                    {#if route.status === 'pending'}
                      <button
                        class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                        onclick={() => deleteRoute(route.id)}
                      >
                        Delete
                      </button>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {:else}
        <div class="flex-1 flex items-center">
          <p
            class="mb-5 text-center text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
          >
            Statistics coming soon
          </p>
        </div>
      {/if}
    </div>
  {/if}
</ListWrapper>

{#if !routePreview && selectedNav === 0}
  {#each categories[selectedNav].data as shipment, index}
    {@const isSelected = selectedShipments.has(String(shipment.id))}
    {@const color = isSelected
      ? `var(--primary-${((index % 3) + 4) * 100})`
      : 'var(--text-300)'}
    {@const shiftX = currentZoom < 14 ? (index % 2) * 10 - 10 : 0}
    {@const shiftY = currentZoom < 14 ? Math.floor(index / 2) * 10 - 10 : 0}

    {#if shipment.pickup}
      <Marker
        onClick={() => toggleShipmentSelection(String(shipment.id))}
        location={{ lng: shipment.pickup.lng, lat: shipment.pickup.lat }}
        name={String(index + 1)}
        active={isSelected}
        {color}
        type="P"
        offset={[shiftX, shiftY]}
      />
    {/if}
    {#if shipment.delivery}
      <Marker
        onClick={() => toggleShipmentSelection(String(shipment.id))}
        location={{ lng: shipment.delivery.lng, lat: shipment.delivery.lat }}
        name={String(index + 1)}
        active={isSelected}
        {color}
        type="D"
        offset={[shiftX, shiftY]}
      />
    {/if}
  {/each}

  {#if startLocation}
    <Marker
      location={startLocation}
      onClick={() => {}}
      name="S"
      active={true}
      color="var(--primary-500)"
      type="S"
    />
  {/if}

  {#if endLocation}
    <Marker
      location={endLocation}
      onClick={() => {}}
      name="E"
      active={true}
      color="var(--secondary-500)"
      type="E"
    />
  {/if}
{/if}

<script lang="ts">
  import { page } from '$app/stores';
  import clsx from 'clsx';
  import HomeIcon from './HomeIcon.svelte';
  import { Box, TruckIcon } from 'lucide-svelte';
  import SendIcon from './SendIcon.svelte';
  import { wallet } from '$src/lib/wallet.svelte';
  import Button from './Button.svelte';

  let apiConnected = $state(false);
  let currentPage = $derived($page.url.pathname);
  let isNavbarOpen = $state(false);
  let navigationItems = $derived([
    { label: 'Home', href: '/', Component: HomeIcon },
    { label: 'Shippers', href: '/map/shippers', Component: Box },
    { label: 'Drivers', href: '/map/drivers', Component: TruckIcon },
    { label: 'Track', href: '/map/track', Component: SendIcon },
  ]);

  export async function fetchChallenge(): Promise<{ sessionId: string; challenge: string }> {
    const response = await fetch('http://localhost:5000/auth/challenge');
    if (!response.ok) {
      throw new Error('Failed to fetch challenge');
    }
    return response.json();
  }

  async function connectApi() {
    if (!$wallet.connected) {
      await wallet.connect();
    }

    if (!$wallet.connected) return;

    const { sessionId, challenge } = await fetchChallenge();

    const delegationIdentity = {
      kind: 'authorize-client-success',
      delegations: $wallet.delegations.delegations,
      userPublicKey: $wallet.delegations.userKey,
    };

    const response = await fetch('http://localhost:5000/auth/icp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        {
          sessionId,
          challenge,
          delegationIdentity,
        },
        (_, v) => {
          return typeof v === 'bigint' ? v.toString() : v;
        },
      ),
    });

    if (response.ok) {
      const { accessToken } = await response.json();
      localStorage.setItem('api_token', accessToken);
      apiConnected = true;
    } else {
      console.error('API connection failed');
    }
  }

  $inspect(currentPage);
</script>

<nav class="hidden md:block">
  <div class="fixed left-5 top-5 z-10">
    <a href="/">
      <img src="/logo.svg" alt="logo" class="w-16" />
    </a>
  </div>

  <div
    class="fixed left-6 w-10 bg-white rounded-full top-1/2 transform -translate-y-1/2 py-1.5 px-7 shadow-lg z-10 bg-white"
  >
    <div class="flex flex-col items-center justify-center space-y-3">
      {#each navigationItems as { label, href, Component }}
        <div
          class={clsx(
            'flex flex-col justify-center items-center space-y-4 rounded-full  p-3 z-20',
            currentPage == href ? 'bg-secondary-200' : '',
          )}
        >
          <div class={clsx('group relative')}>
            <a {href}>
              <Component />
            </a>
            <span
              class="opacity-0 group-hover:opacity-100 duration-300 bg-white absolute left-12 -top-2 p-2 rounded-lg shadow"
            >
              {label}
            </span>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <div class="fixed top-7 right-7 z-40">
    {#if $wallet.connected && $wallet.identity}
      <Button onClick={() => {}}>
        Identity {$wallet.identity.getPrincipal().toText().substring(0, 6)}...
      </Button>
    {:else}
      <Button onClick={async () => await wallet.connect()}
        >Connect wallet</Button
      >
    {/if}
  </div>
</nav>

<nav class="md:hidden">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    class={clsx(
      'fixed z-30 right-0 w-12 m-5 cursor-pointer',
      isNavbarOpen ? 'hidden' : '',
    )}
    onclick={() => (isNavbarOpen = !isNavbarOpen)}
  >
    <path
      stroke="var(--primary)"
      stroke-linecap="round"
      stroke-miterlimit="10"
      stroke-width="32"
      d="M80 160h352M80 256h352M80 352h352"
    />
  </svg>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    class={clsx(
      'fixed z-30 right-0 w-12 m-5 cursor-pointer',
      !isNavbarOpen ? 'hidden' : '',
    )}
    onclick={() => (isNavbarOpen = !isNavbarOpen)}
  >
    <path
      stroke="var(--secondary)"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="32"
      d="M368 368L144 144M368 144L144 368"
    />
  </svg>

  <div
    class={clsx(
      'fixed left-0 z-20 top-0 flex flex-col h-screen w-full items-center justify-between bg-background',
      !isNavbarOpen ? 'hidden' : '',
    )}
  >
    <div></div>
    <nav class="">
      <ul class="flex h-3/4 flex-col items-center space-y-12">
        {#each navigationItems as { label, href }}
          {#if label !== 'Track'}
            <div
              class={clsx(
                'p-5 rounded-xl flex flex-col justify-center items-center',
                currentPage == href ? 'bg-primary-100' : 'p-20',
              )}
            >
              <a
                {href}
                onclick={() => (isNavbarOpen = false)}
                class={clsx(
                  'text-2xl',
                  currentPage === href
                    ? 'bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'
                    : '',
                )}
              >
                {label}
              </a>
            </div>
          {/if}
        {/each}
      </ul>
    </nav>

    <div class="mb-5 space-y-2">
      {#if apiConnected}
        <Button onClick={() => {}}>Connected to API</Button>
      {:else}
        <Button onClick={connectApi}>Connect API</Button>
      {/if}

      {#if $wallet.connected && $wallet.identity}
        <Button onClick={() => {}}>
          Identity {$wallet.identity.getPrincipal().toText().substring(0, 6)}...
        </Button>
      {:else}
        <Button onClick={async () => await wallet.connect()}
          >Connect wallet</Button
        >
      {/if}
    </div>
  </div>
</nav>

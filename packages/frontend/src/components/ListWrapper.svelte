<script lang="ts">
  import clsx from 'clsx';
  import type { Snippet } from 'svelte';

  let {
    isMobileOpen = $bindable(false),
    children,
  }: { isMobileOpen: boolean; children: Snippet } = $props();
</script>

<div
  class={clsx(
    'fixed md:hidden w-full bottom-0 left-0 md:top-2/3 flex-col flex z-10 rounded-t-3xl xl:max-w-md pt-4 shadow-xl bg-background-50 ease-in-out transition-all duration-300',
    isMobileOpen ? 'h-3/4' : 'h-1/5',
  )}
>
  <div class="cursor-pointer flex justify-center mt-2 flex-none">
    {#if !isMobileOpen}
      <button onclick={() => (isMobileOpen = !isMobileOpen)} aria-label="Open">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          fill="var(--primary-400)"
          class="animate-bounce ease-in-out"
          viewBox="0 0 16 16"
        >
          <path
            fill-rule="evenodd"
            d="M7.646 2.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 3.707 2.354 9.354a.5.5 0 1 1-.708-.708z"
          />
          <path
            fill-rule="evenodd"
            d="M7.646 6.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 7.707l-5.646 5.647a.5.5 0 0 1-.708-.708z"
          />
        </svg>
      </button>
    {:else}
      <button onclick={() => (isMobileOpen = !isMobileOpen)} aria-label="Close">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          fill="var(--primary-400)"
          class="animate-bounce ease-in-out"
          viewBox="0 0 16 16"
        >
          <path
            fill-rule="evenodd"
            d="M1.646 6.646a.5.5 0 0 1 .708 0L8 12.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"
          />
          <path
            fill-rule="evenodd"
            d="M1.646 2.646a.5.5 0 0 1 .708 0L8 8.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"
          />
        </svg>
      </button>
    {/if}
  </div>

  <div class="flex justify-center flex-1 mt-3 overflow-y-scroll">
    {@render children()}
  </div>
</div>

<div
  class="absolute hidden md:flex justify-center md:w-1/3 xl:w-1/4 2xl:w-1/5 right-7 top-32 z-10 rounded-3xl h-3/4 px-1 py-5 shadow-xl bg-background"
>
  {@render children()}
</div>

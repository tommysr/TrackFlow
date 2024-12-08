<script lang="ts">
  import clsx from 'clsx';
  import type { Snippet } from 'svelte';

  interface IProps {
    showModal: boolean;
    onClose: () => void;
    cls?: string;
    children: Snippet;
    header?: Snippet;
  }

  let {
    showModal = $bindable(),
    onClose,
    cls,
    children,
    header,
  }: IProps = $props();
  let dialog: HTMLDialogElement;

  $effect(() => {
    if (dialog && showModal) dialog.showModal();
    if (dialog && !showModal) dialog.close();
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={dialog}
  class={clsx('rounded-3xl', cls ?? 'w-[550px]')}
  onclose={onClose}
  onclick={() => dialog.close()}
  onkeydown={(e) => {
    if (e.key === 'Escape') dialog.close();
  }}
>
  <div
    role="dialog"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => {
      if (e.key === 'Escape') e.stopPropagation();
    }}
    class="flex mx-auto bg-gradient-to-tr from-primary via-secondary to-rose-400 p-1 h-full rounded-3xl"
  >
    <div
      class="flex-1 bg-white rounded-3xl flex flex-col justify-center items-center py-14 px-24"
    >
      {#if header}
        {@render header()}
        <hr />
      {/if}
      {@render children()}
    </div>
  </div>
</dialog>

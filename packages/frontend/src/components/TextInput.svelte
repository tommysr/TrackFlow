<script lang="ts">
  import clsx from 'clsx';
  import InputWrapper from './InputWrapper.svelte';

  interface DecimalInputProps {
    class?: string;
    placeholder?: string;
    value?: string;
    required?: boolean;
    name: string;
    className?: string;
    id: string;
    label: string;
  }

  let {
    class: className,
    placeholder,
    value = $bindable(),
    required,
    name,
    className: cls,
    id,
    label,
  }: DecimalInputProps = $props();
</script>

<InputWrapper {label} {id}>
  <div
    class="rounded-lg border-2 border-gradient-to-r from-primary to-secondary"
  >
    <input
      class={clsx(
        'w-full rounded-3xl bg-transparent px-2 py-2 text-sm text-neutral-600 font-normal placeholder-primary placeholder:italic placeholder:text-slate-400 lg:px-4 lg:py-2 lg:text-base focus:outline-none',
        className,
      )}
      {name}
      autocomplete="off"
      type="text"
      bind:value
      {placeholder}
      {id}
      {required}
    />
  </div>
</InputWrapper>

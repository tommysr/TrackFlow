<script lang="ts">
  import type { Snippet } from 'svelte';

  interface InputWrapperProps {
    label: string;
    id: string;
    children: Snippet;
  }

  let { label, id, children }: InputWrapperProps = $props();
</script>

<div>
  <label class="ml-1.5" for={id}>{label}</label>
  {@render children()}
</div>

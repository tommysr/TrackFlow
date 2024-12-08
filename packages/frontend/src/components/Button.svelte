<script lang="ts">
	import type { Snippet } from 'svelte';

	interface ButtonProps {
		onClick: () => void;
		children: Snippet;
	}

	const { children, onClick }: ButtonProps = $props();
</script>

<div
	class="flex rounded-full mx-auto bg-gradient-to-tr from-primary-200 via-secondary-400 to-accent-100 p-0.5 shadow-lg transition ease-in-out hover:-translate-y-0.5 hover:scale-105 duration-200"
>
	<button onclick={onClick} class="flex-1 bg-white px-5 py-1 rounded-full text-lg"
		>{@render children()}</button
	>
</div>
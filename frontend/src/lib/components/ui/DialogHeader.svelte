<script lang="ts">
	import type { Snippet } from 'svelte';
	import X from 'lucide-svelte/icons/x';

	interface Props {
		onclose?: () => void;
		children?: Snippet;
	}

	let { onclose, children }: Props = $props();
</script>

<div class="relative flex items-center justify-center border-b border-border px-6 py-4">
	<div class="flex-1 text-center">
		{@render children?.()}
	</div>
	{#if onclose}
		<button
			onclick={onclose}
			class="absolute right-4 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
			aria-label="Close"
		>
			<X class="h-5 w-5" />
		</button>
	{/if}
</div>

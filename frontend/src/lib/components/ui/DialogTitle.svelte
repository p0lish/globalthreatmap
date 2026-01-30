<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';

	interface Props {
		class?: string;
		children?: Snippet;
	}

	let { class: className, children }: Props = $props();
</script>

<h2 class={cn('text-lg font-semibold text-foreground', className)}>
	{@render children?.()}
</h2>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		orientation?: 'vertical' | 'horizontal';
		class?: string;
		children?: Snippet;
	}

	let { orientation = 'vertical', class: className, children, ...restProps }: Props = $props();
</script>

<div
	class={cn(
		'relative overflow-hidden',
		orientation === 'vertical' ? 'overflow-y-auto' : 'overflow-x-auto',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>

<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import Skeleton from './Skeleton.svelte';

	interface Props {
		lines?: number;
		class?: string;
	}

	let { lines = 4, class: className }: Props = $props();
</script>

<div class={cn('space-y-3', className)}>
	{#each Array(lines) as _, i}
		<Skeleton class={cn('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')} />
	{/each}
</div>

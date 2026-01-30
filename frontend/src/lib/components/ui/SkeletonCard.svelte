<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import Skeleton from './Skeleton.svelte';

	interface Props {
		class?: string;
	}

	let { class: className }: Props = $props();
</script>

<div class={cn('rounded-lg border border-border bg-card p-4', className)}>
	<div class="flex items-start gap-3">
		<Skeleton class="h-8 w-8 rounded-full" />
		<div class="flex-1 space-y-2">
			<Skeleton class="h-4 w-3/4" />
			<Skeleton class="h-3 w-full" />
			<Skeleton class="h-3 w-full" />
			<div class="flex gap-2 pt-1">
				<Skeleton class="h-5 w-16 rounded-full" />
				<Skeleton class="h-5 w-20 rounded-full" />
			</div>
		</div>
	</div>
</div>

<script lang="ts">
	import { filteredEvents } from '$lib/stores/events';
	import { Button, Badge } from '$lib/components/ui';
	import Globe from 'lucide-svelte/icons/globe';
	import RefreshCw from 'lucide-svelte/icons/refresh-cw';
	import Activity from 'lucide-svelte/icons/activity';
	import HelpCircle from 'lucide-svelte/icons/help-circle';

	interface Props {
		onrefresh: () => void;
		isLoading: boolean;
		onshowhelp?: () => void;
	}

	let { onrefresh, isLoading, onshowhelp }: Props = $props();

	let threatCounts = $derived(
		$filteredEvents.reduce(
			(acc, event) => {
				acc[event.threatLevel] = (acc[event.threatLevel] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		)
	);
</script>

<header
	class="relative flex h-14 items-center justify-between border-b border-border bg-card px-4"
>
	<div class="flex items-center gap-3">
		<div class="flex items-center gap-2">
			<Globe class="h-6 w-6 text-primary" />
			<h1 class="text-lg font-bold text-foreground">Global Threat Map</h1>
		</div>
		<Badge variant="outline" class="hidden md:flex">
			<Activity class="mr-1 h-3 w-3" />
			Live
		</Badge>
	</div>

	<div class="absolute left-1/2 -translate-x-1/2 text-sm text-muted-foreground">
		Powered by{' '}
		<a
			href="https://www.valyu.ai/search-api"
			target="_blank"
			rel="noopener noreferrer"
			class="font-bold text-white hover:underline"
		>
			Valyu
		</a>
	</div>

	<div class="flex items-center gap-4">
		<div class="hidden items-center gap-2 md:flex">
			{#if threatCounts.critical}
				<Badge variant="critical">{threatCounts.critical} Critical</Badge>
			{/if}
			{#if threatCounts.high}
				<Badge variant="high">{threatCounts.high} High</Badge>
			{/if}
			<Badge variant="outline">{$filteredEvents.length} Events</Badge>
		</div>

		<Button variant="ghost" size="icon" onclick={onshowhelp} title="Show features">
			<HelpCircle class="h-4 w-4" />
		</Button>

		<Button variant="ghost" size="icon" onclick={onrefresh} disabled={isLoading} title="Refresh events">
			<RefreshCw class="h-4 w-4 {isLoading ? 'animate-spin' : ''}" />
		</Button>
	</div>
</header>

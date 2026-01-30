<script lang="ts">
	import type { ThreatEvent } from '$lib/types';
	import { Badge } from '$lib/components/ui';
	import ExternalLink from 'lucide-svelte/icons/external-link';
	import MapPin from 'lucide-svelte/icons/map-pin';
	import ChevronDown from 'lucide-svelte/icons/chevron-down';
	import ChevronUp from 'lucide-svelte/icons/chevron-up';

	interface Props {
		event: ThreatEvent;
	}

	let { event }: Props = $props();

	let isExpanded = $state(false);

	function formatRelativeTime(timestamp: string): string {
		const now = new Date();
		const date = new Date(timestamp);
		const diffMs = now.getTime() - date.getTime();
		const diffSecs = Math.floor(diffMs / 1000);
		const diffMins = Math.floor(diffSecs / 60);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffSecs < 60) return 'just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}
</script>

<div class="min-w-[250px] p-2 {isExpanded ? 'max-w-[500px]' : 'max-w-[300px]'}">
	<div class="mb-2 flex items-start justify-between gap-2">
		<h3 class="text-sm font-semibold text-foreground line-clamp-2">
			<a
				href={event.sourceUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-1 text-foreground hover:underline"
			>
				{event.title}
			</a>
		</h3>
		<Badge variant={event.threatLevel} class="shrink-0 text-xs capitalize">
			{event.threatLevel}
		</Badge>
	</div>

	{#if !isExpanded}
		<div class="mb-2 text-xs text-muted-foreground line-clamp-3">
			{event.summary}
		</div>
	{:else}
		<div class="mb-2 max-h-[400px] overflow-y-auto rounded-md bg-muted/30 p-3">
			<div class="prose prose-sm prose-invert max-w-none text-xs">
				{event.rawContent || event.summary}
			</div>
		</div>
	{/if}

	<div class="flex items-center gap-2 text-xs text-muted-foreground">
		<MapPin class="h-3 w-3" />
		<span>
			{event.location.placeName || event.location.country || 'Unknown'}
		</span>
	</div>

	<div class="mt-2 flex items-center justify-between text-xs">
		<span class="text-muted-foreground">
			{formatRelativeTime(event.timestamp)}
		</span>
		<div class="flex items-center gap-2">
			{#if event.rawContent}
				<button
					onclick={() => (isExpanded = !isExpanded)}
					class="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
				>
					{#if isExpanded}
						<ChevronUp class="h-3 w-3" />
						Collapse
					{:else}
						<ChevronDown class="h-3 w-3" />
						Expand
					{/if}
				</button>
			{/if}
			{#if event.sourceUrl}
				<a
					href={event.sourceUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="flex items-center gap-1 text-primary hover:underline"
				>
					Source <ExternalLink class="h-3 w-3" />
				</a>
			{/if}
		</div>
	</div>

	<div class="mt-2 flex flex-wrap gap-1">
		<Badge variant="outline" class="text-xs capitalize">
			{event.category}
		</Badge>
		{#each (event.keywords || []).slice(0, 2) as keyword}
			<Badge variant="secondary" class="text-xs">
				{keyword}
			</Badge>
		{/each}
	</div>
</div>

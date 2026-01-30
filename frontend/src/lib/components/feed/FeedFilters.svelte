<script lang="ts">
	import {
		searchQuery,
		categoryFilters,
		threatLevelFilters,
		clearFilters
	} from '$lib/stores/events';
	import { Input, Button, Badge } from '$lib/components/ui';
	import Search from 'lucide-svelte/icons/search';
	import X from 'lucide-svelte/icons/x';
	import type { EventCategory, ThreatLevel } from '$lib/types';

	const THREAT_LEVELS: ThreatLevel[] = ['critical', 'high', 'medium', 'low', 'info'];

	const CATEGORIES: EventCategory[] = ['outbreak', 'case', 'news', 'research', 'prevention'];

	let hasFilters = $derived(
		$searchQuery || $categoryFilters.length > 0 || $threatLevelFilters.length > 0
	);

	function toggleCategory(category: EventCategory) {
		if ($categoryFilters.includes(category)) {
			categoryFilters.set($categoryFilters.filter((c) => c !== category));
		} else {
			categoryFilters.set([...$categoryFilters, category]);
		}
	}

	function toggleThreatLevel(level: ThreatLevel) {
		if ($threatLevelFilters.includes(level)) {
			threatLevelFilters.set($threatLevelFilters.filter((l) => l !== level));
		} else {
			threatLevelFilters.set([...$threatLevelFilters, level]);
		}
	}
</script>

<div class="border-b border-border p-4 space-y-3">
	<div class="relative">
		<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<Input
			placeholder="Search events..."
			bind:value={$searchQuery}
			class="pl-9 pr-9"
		/>
		{#if $searchQuery}
			<button
				onclick={() => searchQuery.set('')}
				class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
			>
				<X class="h-4 w-4" />
			</button>
		{/if}
	</div>

	<div>
		<p class="mb-2 text-xs font-medium text-muted-foreground">Threat Level</p>
		<div class="flex flex-wrap gap-1">
			{#each THREAT_LEVELS as level}
				<Badge
					variant={$threatLevelFilters.includes(level) ? level : 'outline'}
					class="cursor-pointer capitalize"
					onclick={() => toggleThreatLevel(level)}
				>
					{level}
				</Badge>
			{/each}
		</div>
	</div>

	<div>
		<p class="mb-2 text-xs font-medium text-muted-foreground">Category</p>
		<div class="flex flex-wrap gap-1">
			{#each CATEGORIES as category}
				<Badge
					variant={$categoryFilters.includes(category) ? 'default' : 'outline'}
					class="cursor-pointer capitalize"
					onclick={() => toggleCategory(category)}
				>
					{category}
				</Badge>
			{/each}
		</div>
	</div>

	{#if hasFilters}
		<Button variant="ghost" size="sm" onclick={clearFilters} class="w-full text-muted-foreground">
			<X class="mr-2 h-4 w-4" />
			Clear Filters
		</Button>
	{/if}
</div>

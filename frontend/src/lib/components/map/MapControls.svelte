<script lang="ts">
	import { showHeatmap, showClusters, showWatchboxes, projection, toggleHeatmap, toggleClusters, toggleWatchboxes, toggleProjection } from '$lib/stores/map';
	import { Button } from '$lib/components/ui';
	import { cn } from '$lib/utils/cn';
	import Flame from 'lucide-svelte/icons/flame';
	import Circle from 'lucide-svelte/icons/circle';
	import Square from 'lucide-svelte/icons/square';
	import Globe from 'lucide-svelte/icons/globe';
	import Map from 'lucide-svelte/icons/map';
</script>

<div class="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
	<div class="flex flex-col gap-1 rounded-lg bg-card/90 p-1.5 backdrop-blur-sm border border-border">
		<Button
			variant="ghost"
			size="icon"
			onclick={toggleProjection}
			class={cn('h-8 w-8', $projection === 'globe' && 'bg-primary/20 text-primary')}
			title={$projection === 'globe' ? 'Switch to Flat Map' : 'Switch to Globe View'}
		>
			{#if $projection === 'globe'}
				<Map class="h-4 w-4" />
			{:else}
				<Globe class="h-4 w-4" />
			{/if}
		</Button>
		<Button
			variant="ghost"
			size="icon"
			onclick={toggleHeatmap}
			class={cn('h-8 w-8', $showHeatmap && 'bg-primary/20 text-primary')}
			title="Toggle Heatmap"
		>
			<Flame class="h-4 w-4" />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			onclick={toggleClusters}
			class={cn('h-8 w-8', $showClusters && 'bg-primary/20 text-primary')}
			title="Toggle Clusters"
		>
			<Circle class="h-4 w-4" />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			onclick={toggleWatchboxes}
			class={cn('h-8 w-8', $showWatchboxes && 'bg-primary/20 text-primary')}
			title="Toggle Watchboxes"
		>
			<Square class="h-4 w-4" />
		</Button>
	</div>
</div>

<script lang="ts">
	import { isAutoPlaying, startAutoPlay, stopAutoPlay, viewport, setViewport } from '$lib/stores/map';
	import Play from 'lucide-svelte/icons/play';
	import Pause from 'lucide-svelte/icons/pause';

	const PAN_SPEED = 0.3;
	let animationFrame: number | null = null;

	function handlePlayToggle() {
		if ($isAutoPlaying) {
			stopAutoPlay();
		} else {
			startAutoPlay();
		}
	}

	$effect(() => {
		if (!$isAutoPlaying) {
			if (animationFrame) {
				cancelAnimationFrame(animationFrame);
				animationFrame = null;
			}
			return;
		}

		const animate = () => {
			setViewport({
				longitude: $viewport.longitude + PAN_SPEED
			});
			animationFrame = requestAnimationFrame(animate);
		};

		animationFrame = requestAnimationFrame(animate);

		return () => {
			if (animationFrame) {
				cancelAnimationFrame(animationFrame);
			}
		};
	});
</script>

<div class="absolute bottom-6 left-6 z-10">
	<button
		onclick={handlePlayToggle}
		class="flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200 {$isAutoPlaying
			? 'bg-primary text-primary-foreground hover:bg-primary/90'
			: 'bg-card/95 text-foreground hover:bg-card border border-border'} backdrop-blur-sm"
		title={$isAutoPlaying ? 'Pause auto-pan' : 'Start auto-pan'}
	>
		{#if $isAutoPlaying}
			<Pause class="h-5 w-5" />
		{:else}
			<Play class="h-5 w-5 ml-0.5" />
		{/if}
	</button>
</div>

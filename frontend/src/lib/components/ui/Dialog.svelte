<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/cn';
	import { onMount, onDestroy } from 'svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
		class?: string;
		children?: Snippet;
	}

	let { open, onclose, class: className, children }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}

	function handleBackdropClick() {
		onclose();
	}

	$effect(() => {
		if (open) {
			document.addEventListener('keydown', handleKeydown);
			document.body.style.overflow = 'hidden';
		} else {
			document.removeEventListener('keydown', handleKeydown);
			document.body.style.overflow = '';
		}

		return () => {
			document.removeEventListener('keydown', handleKeydown);
			document.body.style.overflow = '';
		};
	});
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<!-- Backdrop -->
		<button
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
			onclick={handleBackdropClick}
			aria-label="Close dialog"
		></button>
		<!-- Dialog content -->
		<div
			class={cn(
				'relative z-10 max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-card shadow-xl',
				className
			)}
			role="dialog"
			aria-modal="true"
		>
			{@render children?.()}
		</div>
	</div>
{/if}

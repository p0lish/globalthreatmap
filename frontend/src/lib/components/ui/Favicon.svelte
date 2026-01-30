<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import Globe from 'lucide-svelte/icons/globe';

	interface Props {
		url: string;
		size?: number;
		class?: string;
	}

	let { url, size = 16, class: className }: Props = $props();

	let error = $state(false);

	function getHostname(urlStr: string): string | null {
		try {
			return new URL(urlStr).hostname;
		} catch {
			return null;
		}
	}

	let hostname = $derived(getHostname(url));
	let faviconUrl = $derived(
		hostname ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size * 2}` : null
	);

	function handleError() {
		error = true;
	}
</script>

{#if !hostname || error}
	<Globe class={cn('text-muted-foreground', className)} style="width: {size}px; height: {size}px;" />
{:else}
	<img
		src={faviconUrl}
		alt=""
		width={size}
		height={size}
		class={cn('shrink-0 rounded-sm', className)}
		onerror={handleError}
	/>
{/if}

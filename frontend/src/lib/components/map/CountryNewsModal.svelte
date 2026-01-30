<script lang="ts">
	import { Dialog, DialogHeader, DialogTitle, DialogContent, ScrollArea, Markdown, Skeleton, Favicon } from '$lib/components/ui';
	import { cn } from '$lib/utils/cn';
	import Biohazard from 'lucide-svelte/icons/biohazard';
	import ExternalLink from 'lucide-svelte/icons/external-link';
	import History from 'lucide-svelte/icons/history';
	import AlertTriangle from 'lucide-svelte/icons/alert-triangle';
	import Database from 'lucide-svelte/icons/database';
	import RotateCw from 'lucide-svelte/icons/rotate-cw';

	interface Props {
		country: string | null;
		onclose: () => void;
		onloadingchange?: (isLoading: boolean) => void;
	}

	let { country, onclose, onloadingchange }: Props = $props();

	interface NewsSection {
		conflicts: string;
		sources: { title: string; url: string }[];
	}

	interface NewsData {
		country: string;
		past: NewsSection;
		current: NewsSection;
	}

	type TabType = 'current' | 'past';

	let data = $state<NewsData | null>(null);
	let isLoading = $state(false);
	let isStreamingCurrent = $state(false);
	let isStreamingPast = $state(false);
	let error = $state<string | null>(null);
	let activeTab = $state<TabType>('current');
	let eventSource: EventSource | null = null;

	$effect(() => {
		if (!country) {
			data = null;
			error = null;
			onloadingchange?.(false);
			return;
		}

		if (eventSource) {
			eventSource.close();
		}

		isLoading = true;
		isStreamingCurrent = true;
		isStreamingPast = false;
		onloadingchange?.(true);
		error = null;
		activeTab = 'current';

		data = {
			country,
			current: { conflicts: '', sources: [] },
			past: { conflicts: '', sources: [] }
		};

		eventSource = new EventSource(
			`/api/countries/conflicts?country=${encodeURIComponent(country)}&stream=true`
		);

		eventSource.onmessage = (event) => {
			try {
				const chunk = JSON.parse(event.data);

				switch (chunk.type) {
					case 'current_content':
						if (data) {
							data.current.conflicts += chunk.content || '';
						}
						break;

					case 'current_sources':
						if (data) {
							data.current.sources = chunk.sources || [];
						}
						isStreamingCurrent = false;
						isStreamingPast = true;
						break;

					case 'past_content':
						if (data) {
							data.past.conflicts += chunk.content || '';
						}
						break;

					case 'past_sources':
						if (data) {
							data.past.sources = chunk.sources || [];
						}
						break;

					case 'done':
						isLoading = false;
						isStreamingCurrent = false;
						isStreamingPast = false;
						onloadingchange?.(false);
						eventSource?.close();
						break;

					case 'error':
						error = chunk.error || 'An error occurred';
						isLoading = false;
						isStreamingCurrent = false;
						isStreamingPast = false;
						onloadingchange?.(false);
						eventSource?.close();
						break;
				}
			} catch {
				// Ignore JSON parse errors
			}
		};

		eventSource.onerror = () => {
			error = 'Connection lost. Please try again.';
			isLoading = false;
			isStreamingCurrent = false;
			isStreamingPast = false;
			onloadingchange?.(false);
			eventSource?.close();
		};

		return () => {
			eventSource?.close();
		};
	});

	let isStreaming = $derived(
		(activeTab === 'current' && isStreamingCurrent) || (activeTab === 'past' && isStreamingPast)
	);

	let showAnswerSkeleton = $derived(isLoading && !data?.[activeTab].conflicts);
	let showSourcesSkeleton = $derived(isLoading && data?.[activeTab].sources.length === 0);
</script>

<Dialog open={!!country} {onclose}>
	<DialogHeader {onclose}>
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
				<Biohazard class="h-5 w-5 text-red-400" />
			</div>
			<div>
				<DialogTitle>{country}</DialogTitle>
				<p class="text-sm text-muted-foreground">Nipah virus related news and sources</p>
			</div>
		</div>
	</DialogHeader>

	<DialogContent class="max-h-[60vh]">
		{#if error}
			<div class="rounded-lg bg-destructive/10 p-4 text-center">
				<p class="text-sm text-destructive">{error}</p>
			</div>
		{/if}

		{#if data}
			<div class="flex h-full flex-col">
				<!-- Tabs -->
				<div class="mb-4 flex gap-2 border-b border-border">
					<button
						onclick={() => (activeTab = 'current')}
						class={cn(
							'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
							activeTab === 'current'
								? 'border-red-500 text-red-400'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						)}
					>
						<AlertTriangle class="h-4 w-4" />
						Current
						{#if isStreamingCurrent}
							<RotateCw class="h-3 w-3 animate-spin" />
						{/if}
					</button>
					<button
						onclick={() => (activeTab = 'past')}
						class={cn(
							'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
							activeTab === 'past'
								? 'border-blue-500 text-blue-400'
								: 'border-transparent text-muted-foreground hover:text-foreground'
						)}
					>
						<History class="h-4 w-4" />
						Historical
						{#if isStreamingPast}
							<RotateCw class="h-3 w-3 animate-spin" />
						{/if}
					</button>
				</div>

				<!-- Tab Content -->
				<ScrollArea class="flex-1 pr-4">
					<div class="space-y-6">
						<!-- Answer Section -->
						{#if showAnswerSkeleton}
							<div class="rounded-lg border border-border bg-card p-4">
								<div class="mb-4 flex items-center gap-2">
									<RotateCw class="h-4 w-4 animate-spin text-muted-foreground" />
									<span class="text-sm text-muted-foreground">
										Researching news - typically under 15 seconds
									</span>
								</div>
								<div class="space-y-3">
									<Skeleton class="h-4 w-full" />
									<Skeleton class="h-4 w-full" />
									<Skeleton class="h-4 w-11/12" />
									<Skeleton class="h-4 w-full" />
									<Skeleton class="h-4 w-4/5" />
								</div>
							</div>
						{:else if data[activeTab].conflicts}
							<div class="rounded-lg border border-border bg-card p-4">
								<div class="mb-4 flex items-center gap-2"></div>
								<div class="prose prose-base prose-invert max-w-none">
									<Markdown content={data[activeTab].conflicts} class="text-base leading-relaxed" />
									{#if isStreaming}
										<span class="inline-block h-4 w-1 animate-pulse bg-primary"></span>
									{/if}
								</div>
							</div>
						{/if}

						<!-- Sources Section -->
						{#if showSourcesSkeleton}
							<div class="space-y-3">
								<div class="flex items-center gap-2">
									<Database class="h-4 w-4 text-muted-foreground" />
									<span class="font-medium text-foreground">Sources</span>
									<span class="text-sm text-muted-foreground">loading sources...</span>
								</div>
								<div class="space-y-3">
									{#each [1, 2, 3] as i}
										<div class="rounded-lg border border-border bg-card p-4">
											<div class="flex items-start gap-3">
												<Skeleton class="h-6 w-6 rounded-full" />
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
									{/each}
								</div>
							</div>
						{:else if data[activeTab].sources.length > 0}
							<div class="space-y-3">
								<div class="flex items-center gap-2">
									<Database class="h-4 w-4 text-muted-foreground" />
									<span class="font-medium text-foreground">Sources</span>
									<span class="text-sm text-muted-foreground">
										({data[activeTab].sources.length})
									</span>
								</div>
								<div class="space-y-2">
									{#each data[activeTab].sources.slice(0, 10) as source, i}
										<a
											href={source.url}
											target="_blank"
											rel="noopener noreferrer"
											class="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm transition-colors hover:bg-muted/50"
										>
											<Favicon url={source.url} size={20} class="mt-0.5" />
											<div class="flex-1 min-w-0">
												<span class="line-clamp-2 text-foreground">
													{source.title}
												</span>
												<span class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
													<ExternalLink class="h-3 w-3" />
													{new URL(source.url).hostname}
												</span>
											</div>
										</a>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</ScrollArea>
			</div>
		{/if}

		{#if !isLoading && !error && !data}
			<div class="py-12 text-center">
				<Biohazard class="mx-auto h-12 w-12 text-muted-foreground/50" />
				<p class="mt-4 text-sm text-muted-foreground">
					Click on a country to view its conflict history
				</p>
			</div>
		{/if}
	</DialogContent>
</Dialog>

<script lang="ts">
	import {
		Input,
		Button,
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		ScrollArea,
		Badge,
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		Markdown,
		Favicon,
	} from "$lib/components/ui";
	import {
		flyTo,
		setEntityLocations,
		clearEntityLocations,
	} from "$lib/stores/map";
	import { isAuthenticated, getAccessToken } from "$lib/stores/auth";
	import SignInModal from "$lib/components/auth/SignInModal.svelte";
	import Search from "lucide-svelte/icons/search";
	import Loader2 from "lucide-svelte/icons/loader-2";
	import Building2 from "lucide-svelte/icons/building-2";
	import User from "lucide-svelte/icons/user";
	import Globe from "lucide-svelte/icons/globe";
	import Users from "lucide-svelte/icons/users";
	import FileText from "lucide-svelte/icons/file-text";
	import Lock from "lucide-svelte/icons/lock";
	import FileSpreadsheet from "lucide-svelte/icons/file-spreadsheet";
	import Presentation from "lucide-svelte/icons/presentation";
	import File from "lucide-svelte/icons/file";
	import Maximize2 from "lucide-svelte/icons/maximize-2";
	import type { EntityProfile } from "$lib/types";
	const APP_MODE = import.meta.env.VITE_APP_MODE || "self-hosted";

	const typeIcons = {
		organization: Building2,
		person: User,
		country: Globe,
		group: Users,
	};

	interface DeepResearchProgress {
		currentStep: number;
		totalSteps: number;
	}

	interface DeepResearchResult {
		output: string;
		sources: Array<{ title: string; url: string }>;
		deliverables?: Array<{
			type: string;
			title: string;
			url: string;
			status: string;
		}>;
		pdfUrl?: string;
	}

	let query = $state("");
	let entity = $state<EntityProfile | null>(null);
	let showSignInModal = $state(false);
	let showFullReport = $state(false);

	let deepResearchTaskId = $state<string | null>(null);
	let deepResearchProgress = $state<DeepResearchProgress | null>(null);
	let deepResearchResult = $state<DeepResearchResult | null>(null);
	let deepResearchError = $state<string | null>(null);
	let pollingInterval: ReturnType<typeof setInterval> | null = null;

	let requiresAuth = $derived(APP_MODE === "valyu");
	let isLoading = $derived(!!deepResearchTaskId);
	let TypeIcon = $derived(entity ? typeIcons[entity.type] : Building2);

	$effect(() => {
		if (!deepResearchTaskId) return;

		const pollStatus = async () => {
			try {
				const accessToken = getAccessToken();
				const url = new URL(
					`/api/deepresearch/${deepResearchTaskId}`,
					window.location.origin,
				);
				if (accessToken) {
					url.searchParams.set("accessToken", accessToken);
				}
				const response = await fetch(url.toString());
				const data = await response.json();

				if (data.error) {
					deepResearchError = data.error;
					deepResearchTaskId = null;
					if (pollingInterval) clearInterval(pollingInterval);
					return;
				}

				if (data.progress) {
					deepResearchProgress = data.progress;
				}

				if (data.status === "completed") {
					deepResearchResult = {
						output: data.output,
						sources: data.sources || [],
						deliverables: data.deliverables,
						pdfUrl: data.pdfUrl,
					};
					deepResearchTaskId = null;
					if (pollingInterval) clearInterval(pollingInterval);
				} else if (data.status === "failed") {
					deepResearchError = data.error || "Research failed";
					deepResearchTaskId = null;
					if (pollingInterval) clearInterval(pollingInterval);
				}
			} catch (err) {
				console.error("Polling error:", err);
			}
		};

		pollStatus();
		pollingInterval = setInterval(pollStatus, 5000);

		return () => {
			if (pollingInterval) clearInterval(pollingInterval);
		};
	});

	async function handleSearch() {
		if (!query.trim()) return;

		if (!$isAuthenticated) {
			showSignInModal = true;
			return;
		}

		clearEntityLocations();
		entity = null;
		deepResearchResult = null;
		deepResearchProgress = null;
		deepResearchError = null;

		entity = {
			id: `entity_${Date.now()}`,
			name: query,
			type: "group",
			description: "",
			locations: [],
			relatedEntities: [],
			economicData: {},
		};

		const accessToken = getAccessToken();
		fetch("/api/deepresearch", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ topic: query, accessToken }),
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.error) {
					deepResearchError = data.error;
				} else if (data.taskId) {
					deepResearchTaskId = data.taskId;
				}
			})
			.catch(() => {
				deepResearchError = "Failed to start research";
			});
	}

	function handleShowOnMap() {
		if (entity?.locations && entity.locations.length > 0) {
			setEntityLocations(entity.name, entity.locations);
			const firstLocation = entity.locations[0];
			flyTo(firstLocation.longitude, firstLocation.latitude, 4);
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === "Enter") {
			handleSearch();
		}
	}

	function getDeliverable(type: string) {
		return deepResearchResult?.deliverables?.find(
			(d) => d.type === type && d.status === "completed",
		);
	}
</script>

<div class="flex h-full flex-col">
	<div class="border-b border-border p-4">
		<h2 class="text-lg font-semibold text-foreground">Build Dossier</h2>
		<p class="text-sm text-muted-foreground">
			Deep research on any actor with sourced analysis
		</p>
	</div>

	<div class="p-4 space-y-3">
		<div class="flex gap-2">
			<div class="relative flex-1">
				<Search
					class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				/>
				<Input
					placeholder="e.g. Wagner Group, Hezbollah, North Korea..."
					bind:value={query}
					onkeydown={handleKeyDown}
					class="pl-9"
				/>
			</div>
			<Button
				onclick={handleSearch}
				disabled={isLoading || !query.trim()}
			>
				{#if isLoading}
					<Loader2 class="h-4 w-4 animate-spin" />
				{:else}
					Research
				{/if}
			</Button>
		</div>

		{#if isLoading}
			<div
				class="rounded-lg bg-primary/10 border border-primary/20 p-3 text-sm"
			>
				<div
					class="flex items-center gap-2 text-foreground font-medium mb-2"
				>
					<Loader2 class="h-4 w-4 animate-spin text-primary" />
					Generating Intelligence Report
				</div>
				{#if deepResearchProgress}
					<div class="space-y-1">
						<div
							class="flex justify-between text-xs text-muted-foreground"
						>
							<span
								>Step {deepResearchProgress.currentStep} of {deepResearchProgress.totalSteps}</span
							>
							<span
								>{Math.round(
									(deepResearchProgress.currentStep /
										deepResearchProgress.totalSteps) *
										100,
								)}%</span
							>
						</div>
						<div
							class="h-1.5 bg-muted rounded-full overflow-hidden"
						>
							<div
								class="h-full bg-primary transition-all duration-500"
								style="width: {(deepResearchProgress.currentStep /
									deepResearchProgress.totalSteps) *
									100}%"
							></div>
						</div>
					</div>
				{:else}
					<div class="h-1.5 bg-muted rounded-full overflow-hidden">
						<div
							class="h-full bg-primary/50 animate-pulse w-1/4"
						></div>
					</div>
				{/if}
				<p class="text-muted-foreground text-xs mt-2">
					This takes <span class="text-foreground font-medium"
						>5-10 minutes</span
					> but produces an extremely detailed report with CSV data export
					and PowerPoint briefing.
				</p>
			</div>
		{/if}

		{#if deepResearchError}
			<div
				class="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
			>
				{deepResearchError}
			</div>
		{/if}
	</div>

	<ScrollArea class="flex-1 p-4">
		{#if entity && deepResearchResult}
			<Card>
				<CardHeader class="pb-3">
					<div class="flex items-start gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20"
						>
							<TypeIcon class="h-5 w-5 text-primary" />
						</div>
						<div class="flex-1">
							<CardTitle class="text-lg">{entity.name}</CardTitle>
							<Badge variant="outline" class="mt-1 capitalize">
								{entity.type}
							</Badge>
						</div>
					</div>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<h4
								class="flex items-center gap-2 text-sm font-medium text-foreground"
							>
								<FileText class="h-4 w-4" />
								Intelligence Report
							</h4>
							<Button
								variant="outline"
								size="sm"
								onclick={() => (showFullReport = true)}
								class="h-7 text-xs"
							>
								<Maximize2 class="mr-1 h-3 w-3" />
								View Full Report
							</Button>
						</div>

						<div
							class="text-sm text-muted-foreground max-h-40 overflow-hidden relative"
						>
							<Markdown
								content={deepResearchResult.output.slice(
									0,
									800,
								) + "..."}
							/>
							<div
								class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent"
							></div>
						</div>

						<div
							class="flex flex-wrap gap-2 pt-2 border-t border-border"
						>
							{#if getDeliverable("csv")}
								<a
									href={getDeliverable("csv")?.url}
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex"
								>
									<Button
										variant="outline"
										size="sm"
										class="h-8 text-xs"
									>
										<FileSpreadsheet
											class="mr-1.5 h-3.5 w-3.5 text-green-500"
										/>
										Download CSV
									</Button>
								</a>
							{/if}
							{#if getDeliverable("pptx")}
								<a
									href={getDeliverable("pptx")?.url}
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex"
								>
									<Button
										variant="outline"
										size="sm"
										class="h-8 text-xs"
									>
										<Presentation
											class="mr-1.5 h-3.5 w-3.5 text-orange-500"
										/>
										Download PPTX
									</Button>
								</a>
							{/if}
							{#if deepResearchResult.pdfUrl}
								<a
									href={deepResearchResult.pdfUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex"
								>
									<Button
										variant="outline"
										size="sm"
										class="h-8 text-xs"
									>
										<File
											class="mr-1.5 h-3.5 w-3.5 text-red-500"
										/>
										Download PDF
									</Button>
								</a>
							{/if}
						</div>
					</div>

					{#if deepResearchResult.sources.length > 0}
						<div>
							<h4
								class="mb-2 text-sm font-medium text-foreground"
							>
								Sources ({deepResearchResult.sources.length})
							</h4>
							<div class="space-y-1">
								{#each deepResearchResult.sources.slice(0, 10) as source, i}
									<a
										href={source.url}
										target="_blank"
										rel="noopener noreferrer"
										class="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
									>
										<Favicon url={source.url} size={16} />
										<span class="truncate"
											>{source.title}</span
										>
									</a>
								{/each}
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>
		{/if}

		{#if !entity && !isLoading}
			<div class="py-8 text-center">
				<FileText class="mx-auto h-12 w-12 text-muted-foreground/50" />
				<p class="mt-4 text-sm text-muted-foreground">
					Enter any actor to compile an intelligence dossier
				</p>
				<div class="mt-3 space-y-1 text-xs text-muted-foreground/70">
					<p>Wagner Group, Houthis, Hezbollah, North Korea</p>
					<p>Nations, militias, PMCs, cartels, political figures</p>
				</div>
				<div
					class="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground"
				>
					<p>
						Reports take <span class="text-foreground font-medium"
							>5-10 minutes</span
						> to generate but are extremely detailed with downloadable
						CSV data and PowerPoint briefings.
					</p>
				</div>
				{#if requiresAuth && !$isAuthenticated}
					<div
						class="mt-4 flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400"
					>
						<Lock class="h-4 w-4" />
						<span>Sign in required</span>
					</div>
				{/if}
			</div>
		{/if}

		{#if entity && isLoading}
			<Card>
				<CardHeader class="pb-3">
					<div class="flex items-start gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20"
						>
							<TypeIcon class="h-5 w-5 text-primary" />
						</div>
						<div class="flex-1">
							<CardTitle class="text-lg">{entity.name}</CardTitle>
							<Badge variant="outline" class="mt-1 capitalize">
								{entity.type}
							</Badge>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div class="space-y-3">
						<div
							class="h-4 bg-muted rounded animate-pulse w-3/4"
						></div>
						<div
							class="h-4 bg-muted rounded animate-pulse w-full"
						></div>
						<div
							class="h-4 bg-muted rounded animate-pulse w-5/6"
						></div>
						<div
							class="h-4 bg-muted rounded animate-pulse w-2/3"
						></div>
					</div>
				</CardContent>
			</Card>
		{/if}
	</ScrollArea>

	<!-- Full Report Dialog -->
	<Dialog
		open={showFullReport}
		onclose={() => (showFullReport = false)}
		class="max-w-4xl"
	>
		<DialogHeader onclose={() => (showFullReport = false)}>
			<DialogTitle class="flex items-center gap-2">
				<FileText class="h-5 w-5" />
				Intelligence Report: {entity?.name}
			</DialogTitle>
		</DialogHeader>
		<DialogContent class="h-[70vh] flex flex-col">
			<div class="flex flex-wrap gap-2 pb-3 border-b border-border mb-3">
				{#if getDeliverable("csv")}
					<a
						href={getDeliverable("csv")?.url}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Button variant="outline" size="sm">
							<FileSpreadsheet
								class="mr-1.5 h-4 w-4 text-green-500"
							/>
							Download CSV
						</Button>
					</a>
				{/if}
				{#if getDeliverable("pptx")}
					<a
						href={getDeliverable("pptx")?.url}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Button variant="outline" size="sm">
							<Presentation
								class="mr-1.5 h-4 w-4 text-orange-500"
							/>
							Download PPTX
						</Button>
					</a>
				{/if}
				{#if deepResearchResult?.pdfUrl}
					<a
						href={deepResearchResult.pdfUrl}
						target="_blank"
						rel="noopener noreferrer"
					>
						<Button variant="outline" size="sm">
							<File class="mr-1.5 h-4 w-4 text-red-500" />
							Download PDF
						</Button>
					</a>
				{/if}
			</div>
			<ScrollArea class="flex-1">
				<div class="prose prose-sm dark:prose-invert max-w-none pr-4">
					{#if deepResearchResult}
						<Markdown content={deepResearchResult.output} />
					{/if}
				</div>
				{#if deepResearchResult?.sources && deepResearchResult.sources.length > 0}
					<div class="mt-8 pt-4 border-t border-border">
						<h4 class="text-sm font-medium mb-3">
							Sources ({deepResearchResult.sources.length})
						</h4>
						<div class="grid grid-cols-2 gap-2">
							{#each deepResearchResult.sources.slice(0, 20) as source, i}
								<a
									href={source.url}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground truncate"
								>
									<Favicon url={source.url} size={12} />
									<span class="truncate">{source.title}</span>
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</ScrollArea>
		</DialogContent>
	</Dialog>

	<SignInModal
		open={showSignInModal}
		onopenchange={(open) => (showSignInModal = open)}
	/>
</div>

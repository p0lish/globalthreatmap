<script lang="ts">
	import { browser } from "$app/environment";
	import {
		Dialog,
		DialogHeader,
		DialogTitle,
		DialogContent,
		DialogFooter,
		Button,
	} from "$lib/components/ui";
	import MapIcon from "lucide-svelte/icons/map";
	import Rss from "lucide-svelte/icons/rss";
	import Search from "lucide-svelte/icons/search";
	import Globe from "lucide-svelte/icons/globe";
	import Shield from "lucide-svelte/icons/shield";
	import Layers from "lucide-svelte/icons/layers";

	const WELCOME_DISMISSED_KEY = "globalthreatmap_welcome_dismissed";

	interface Props {
		open: boolean;
		onopenchange: (open: boolean) => void;
	}

	type FeatureType = {
		icon: typeof MapIcon;
		title: string;
		description: string;
		color: string;
	};

	let { open, onopenchange }: Props = $props();

	let dontShowAgain = $state(false);

	const features: FeatureType[] = [
		{
			icon: MapIcon,
			title: "Interactive Threat Map",
			description:
				"Explore global events with color-coded markers. Click any event for details, or zoom to see clusters expand.",
			color: "text-red-500",
		},
		{
			icon: Rss,
			title: "Event Feed",
			description:
				"Browse live events in the sidebar. Filter by threat level, category, or search for specific incidents.",
			color: "text-orange-500",
		},
		{
			icon: Globe,
			title: "Country Intelligence",
			description:
				"Click any country on the map to view current and historical conflicts with AI-powered analysis.",
			color: "text-blue-500",
		},
		{
			icon: Search,
			title: "Intel Dossiers",
			description:
				"Build intelligence dossiers on any actor. Enable full dossier mode for ~50 page reports with downloadable CSV data exports and PowerPoint briefings.",
			color: "text-purple-500",
		},
		{
			icon: Shield,
			title: "Military Bases",
			description:
				"View US and NATO military installations worldwide. Click any base (green marker) on the map for details about the facility.",
			color: "text-green-500",
		},
		{
			icon: Layers,
			title: "Auto-Pan Mode",
			description:
				"Click on the play button by the bottom left to make the map auto-pan.",
			color: "text-cyan-500",
		},
	];

	function handleClose() {
		if (dontShowAgain && browser) {
			localStorage.setItem(WELCOME_DISMISSED_KEY, "true");
		}
		onopenchange(false);
	}
</script>

<Dialog {open} onclose={handleClose} class="max-w-3xl">
	<DialogHeader onclose={handleClose}>
		<DialogTitle class="flex items-center gap-2">
			<Globe class="h-5 w-5 text-primary" />
			Welcome to Global Threat Map
		</DialogTitle>
	</DialogHeader>

	<DialogContent class="max-h-[60vh]">
		<p class="mb-6 text-muted-foreground">
			Your situational awareness platform for tracking global security
			events, wars, conflicts & threat indicators.
		</p>

		<div class="grid gap-4 sm:grid-cols-2">
			{#each features as feature: FeatureType}
				<div
					class="rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
				>
					<div class="mb-2 flex items-center gap-3">
						<div class={feature.color}>
							<feature.icon class="h-6 w-6" />
						</div>
						<h3 class="font-medium text-foreground">
							{feature.title}
						</h3>
					</div>
					<p class="text-sm text-muted-foreground">
						{feature.description}
					</p>
				</div>
			{/each}
		</div>
	</DialogContent>

	<DialogFooter
		class="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
	>
		<label
			class="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"
		>
			<input
				type="checkbox"
				bind:checked={dontShowAgain}
				class="h-4 w-4 rounded border-border bg-background accent-primary"
			/>
			Don't show this again
		</label>
		<Button onclick={handleClose}>Get Started</Button>
	</DialogFooter>
</Dialog>

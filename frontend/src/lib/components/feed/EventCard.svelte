<script lang="ts">
	import type { ThreatEvent } from "$lib/types";
	import { Card, CardContent, Badge, Markdown } from "$lib/components/ui";
	import { cn } from "$lib/utils/cn";
	import { flyTo } from "$lib/stores/map";
	import MapPin from "lucide-svelte/icons/map-pin";
	import Clock from "lucide-svelte/icons/clock";
	import AlertTriangle from "lucide-svelte/icons/alert-triangle";
	import Activity from "lucide-svelte/icons/activity";
	import Newspaper from "lucide-svelte/icons/newspaper";
	import BookOpen from "lucide-svelte/icons/book-open";
	import Shield from "lucide-svelte/icons/shield";

	const categoryIconMap = {
		outbreak: AlertTriangle,
		case: Activity,
		news: Newspaper,
		research: BookOpen,
		prevention: Shield,
	};

	interface Props {
		event: ThreatEvent;
		isSelected: boolean;
		onclick: () => void;
		style?: string;
	}

	let { event, isSelected, onclick, style = "" }: Props = $props();

	let CategoryIcon = $derived(
		categoryIconMap[event.category] || AlertTriangle,
	);

	function formatRelativeTime(timestamp: string): string {
		const now = new Date();
		const date = new Date(timestamp);
		const diffMs = now.getTime() - date.getTime();
		const diffSecs = Math.floor(diffMs / 1000);
		const diffMins = Math.floor(diffSecs / 60);
		const diffHours = Math.floor(diffMins / 60);
		const diffDays = Math.floor(diffHours / 24);

		if (diffSecs < 60) return "just now";
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}

	function handleClick() {
		onclick();
		flyTo(event.location.longitude, event.location.latitude, 6);
	}
</script>

<Card
	class={cn(
		"cursor-pointer transition-all duration-200 hover:bg-accent/50 event-card-enter",
		isSelected && "ring-2 ring-primary bg-accent/30",
	)}
	{style}
	onclick={handleClick}
>
	<CardContent class="p-3">
		<div class="flex items-start gap-3">
			<div
				class={cn(
					"mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
					event.threatLevel === "critical" &&
						"bg-red-500/20 text-red-400",
					event.threatLevel === "high" &&
						"bg-orange-500/20 text-orange-400",
					event.threatLevel === "medium" &&
						"bg-yellow-500/20 text-yellow-400",
					event.threatLevel === "low" &&
						"bg-green-500/20 text-green-400",
					event.threatLevel === "info" &&
						"bg-blue-500/20 text-blue-400",
				)}
			>
				<CategoryIcon class="h-4 w-4" />
			</div>

			<div class="min-w-0 flex-1">
				<div class="flex items-start justify-between gap-2">
					<h3
						class="text-sm font-medium text-foreground line-clamp-2"
					>
						{event.title}
					</h3>
					<Badge
						variant={event.threatLevel}
						class="shrink-0 text-xs capitalize"
					>
						{event.threatLevel}
					</Badge>
				</div>

				<div class="mt-1 text-xs text-muted-foreground line-clamp-2">
					<Markdown content={event.summary} />
				</div>

				<div
					class="mt-2 flex items-center gap-3 text-xs text-muted-foreground"
				>
					<span class="flex items-center gap-1">
						<MapPin class="h-3 w-3" />
						{event.location.placeName ||
							event.location.country ||
							"Unknown"}
					</span>
					<span class="flex items-center gap-1">
						<Clock class="h-3 w-3" />
						{formatRelativeTime(event.timestamp)}
					</span>
				</div>
			</div>
		</div>
	</CardContent>
</Card>

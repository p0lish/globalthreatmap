<script lang="ts">
	import { cn } from "$lib/utils/cn";
	import { Button } from "$lib/components/ui";
	import EventFeed from "$lib/components/feed/EventFeed.svelte";
	import EntitySearch from "$lib/components/search/EntitySearch.svelte";
	import Activity from "lucide-svelte/icons/activity";
	import FileText from "lucide-svelte/icons/file-text";
	import ChevronLeft from "lucide-svelte/icons/chevron-left";
	import ChevronRight from "lucide-svelte/icons/chevron-right";
	import { Globe, Icon } from "lucide-svelte";

	type Tab = "feed" | "search";

	let activeTab = $state<Tab>("feed");
	let isCollapsed = $state(false);
	const tabs = [
		{ id: "feed" as Tab, label: "Live Feed", icon: Activity },
		{ id: "search" as Tab, label: "Intel", icon: FileText },
	];
</script>

<div
	class={cn(
		"relative flex h-full flex-col border-l border-border bg-card transition-all duration-300",
		isCollapsed ? "w-12" : "w-96",
	)}
>
	<Button
		variant="ghost"
		size="icon"
		class="absolute -left-3 top-4 z-10 h-6 w-6 rounded-full border border-border bg-card"
		onclick={() => (isCollapsed = !isCollapsed)}
	>
		{#if isCollapsed}
			<ChevronLeft class="h-3 w-3" />
		{:else}
			<ChevronRight class="h-3 w-3" />
		{/if}
	</Button>

	{#if !isCollapsed}
		<div class="flex border-b border-border">
			{#each tabs as tab}
				<button
					onclick={() => (activeTab = tab.id)}
					class={cn(
						"flex flex-1 items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
						activeTab === tab.id
							? "border-b-2 border-primary text-primary"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					<Globe class="h-4 w-4" />
					{tab.label}
				</button>
			{/each}
		</div>

		<div class="flex-1 overflow-hidden">
			{#if activeTab === "feed"}
				<EventFeed />
			{:else if activeTab === "search"}
				<EntitySearch />
			{/if}
		</div>
	{/if}

	{#if isCollapsed}
		<div class="flex flex-col items-center gap-2 pt-12">
			{#each tabs as tab}
				<Button
					variant="ghost"
					size="icon"
					onclick={() => {
						activeTab = tab.id;
						isCollapsed = false;
					}}
					class={cn(
						"h-8 w-8",
						activeTab === tab.id && "bg-primary/20 text-primary",
					)}
				>
					<tab.icon class="h-4 w-4" />
				</Button>
			{/each}
		</div>
	{/if}
</div>

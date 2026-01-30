<script lang="ts">
	import {
		filteredEvents,
		isLoading,
		error,
		selectedEvent
	} from '$lib/stores/events';
	import { isAuthenticated } from '$lib/stores/auth';
	import { ScrollArea, Button } from '$lib/components/ui';
	import EventCard from './EventCard.svelte';
	import FeedFilters from './FeedFilters.svelte';
	import SignInModal from '$lib/components/auth/SignInModal.svelte';
	import Loader2 from 'lucide-svelte/icons/loader-2';
	import Lock from 'lucide-svelte/icons/lock';
	const APP_MODE = import.meta.env.VITE_APP_MODE || 'self-hosted';

	let showSignInModal = $state(false);

	let requiresAuth = $derived(APP_MODE === 'valyu');
	let showSignInPrompt = $derived(
		requiresAuth && !$isAuthenticated && !$isLoading && $filteredEvents.length === 0
	);

	function selectEvent(event: typeof $selectedEvent) {
		selectedEvent.set(event);
	}
</script>

<div class="flex h-full flex-col">
	<div class="border-b border-border p-4">
		<h2 class="text-lg font-semibold text-foreground">Event Feed</h2>
		<p class="text-sm text-muted-foreground">
			{$filteredEvents.length} events
		</p>
	</div>

	<FeedFilters />

	<ScrollArea class="flex-1 p-4">
		{#if $isLoading}
			<div class="flex items-center justify-center py-8">
				<Loader2 class="h-6 w-6 animate-spin text-primary" />
				<span class="ml-2 text-sm text-muted-foreground">Loading events...</span>
			</div>
		{/if}

		{#if $error}
			<div class="rounded-lg bg-destructive/10 p-4 text-center">
				<p class="text-sm text-destructive">{$error}</p>
			</div>
		{/if}

		{#if showSignInPrompt}
			<div class="py-8 text-center">
				<Lock class="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
				<p class="text-sm font-medium text-foreground mb-1">Sign in to view events</p>
				<p class="text-xs text-muted-foreground mb-4">Events require authentication</p>
				<Button variant="outline" size="sm" onclick={() => (showSignInModal = true)}>
					Sign in
				</Button>
			</div>
		{/if}

		{#if !$isLoading && !$error && !showSignInPrompt && $filteredEvents.length === 0}
			<div class="py-8 text-center">
				<p class="text-sm text-muted-foreground">No events match your filters</p>
			</div>
		{/if}

		<div class="space-y-3">
			{#each $filteredEvents as event, index (event.id)}
				<EventCard
					{event}
					isSelected={$selectedEvent?.id === event.id}
					onclick={() => selectEvent(event)}
					style="animation-delay: {index * 50}ms"
				/>
			{/each}
		</div>
	</ScrollArea>

	<SignInModal open={showSignInModal} onopenchange={(open) => (showSignInModal = open)} />
</div>

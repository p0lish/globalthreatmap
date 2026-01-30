<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { fetchEvents, isLoading } from '$lib/stores/events';
	import { getAccessToken, initialize } from '$lib/stores/auth';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import ThreatMap from '$lib/components/map/ThreatMap.svelte';
	import MapControls from '$lib/components/map/MapControls.svelte';
	import TimelineScrubber from '$lib/components/map/TimelineScrubber.svelte';
	import WelcomeModal from '$lib/components/WelcomeModal.svelte';

	const WELCOME_DISMISSED_KEY = 'globalthreatmap_welcome_dismissed';

	let showWelcome = $state(false);

	async function handleRefresh() {
		const accessToken = getAccessToken();
		await fetchEvents(accessToken || undefined);
	}

	function handleShowHelp() {
		showWelcome = true;
	}

	onMount(() => {
		// Initialize auth state
		initialize();

		// Check if welcome modal should be shown
		if (browser) {
			const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY);
			if (!dismissed) {
				showWelcome = true;
			}
		}

		// Fetch initial events
		const accessToken = getAccessToken();
		fetchEvents(accessToken || undefined);

		// Set up auto-refresh (5 minutes)
		const refreshInterval = setInterval(() => {
			const token = getAccessToken();
			fetchEvents(token || undefined);
		}, 300000);

		return () => {
			clearInterval(refreshInterval);
		};
	});
</script>

<svelte:head>
	<title>Global Threat Map</title>
	<meta
		name="description"
		content="Real-time global security intelligence and threat monitoring platform"
	/>
</svelte:head>

<div class="flex h-screen flex-col bg-background text-foreground overflow-hidden">
	<Header onrefresh={handleRefresh} isLoading={$isLoading} onshowhelp={handleShowHelp} />

	<div class="flex flex-1 overflow-hidden">
		<!-- Map Container -->
		<div class="relative flex-1">
			<ThreatMap />
			<MapControls />
			<TimelineScrubber />
		</div>

		<!-- Sidebar -->
		<Sidebar />
	</div>

	<!-- Welcome Modal -->
	<WelcomeModal open={showWelcome} onopenchange={(open) => (showWelcome = open)} />
</div>

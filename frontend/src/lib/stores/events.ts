import { writable, derived, get } from 'svelte/store';
import type { ThreatEvent, TimeRange } from '$lib/types';

// Threat level priority for sorting (lower = higher priority)
const THREAT_LEVEL_PRIORITY: Record<string, number> = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3,
	info: 4
};

// Base stores
export const events = writable<ThreatEvent[]>([]);
export const selectedEvent = writable<ThreatEvent | null>(null);
export const isLoading = writable(false);
export const error = writable<string | null>(null);
export const timeRange = writable<TimeRange | null>(null);
export const categoryFilters = writable<string[]>([]);
export const threatLevelFilters = writable<string[]>([]);
export const searchQuery = writable('');

// Derived store for filtered events
export const filteredEvents = derived(
	[events, timeRange, categoryFilters, threatLevelFilters, searchQuery],
	([$events, $timeRange, $categoryFilters, $threatLevelFilters, $searchQuery]) => {
		let filtered = [...$events];

		// Apply time range filter
		if ($timeRange) {
			filtered = filtered.filter((event) => {
				const eventTime = new Date(event.timestamp);
				return eventTime >= $timeRange.start && eventTime <= $timeRange.end;
			});
		}

		// Apply category filter
		if ($categoryFilters.length > 0) {
			filtered = filtered.filter((event) => $categoryFilters.includes(event.category));
		}

		// Apply threat level filter
		if ($threatLevelFilters.length > 0) {
			filtered = filtered.filter((event) => $threatLevelFilters.includes(event.threatLevel));
		}

		// Apply search query
		if ($searchQuery.trim()) {
			const query = $searchQuery.toLowerCase();
			filtered = filtered.filter(
				(event) =>
					event.title.toLowerCase().includes(query) ||
					event.summary.toLowerCase().includes(query) ||
					event.location.placeName?.toLowerCase().includes(query) ||
					event.location.country?.toLowerCase().includes(query)
			);
		}

		// Sort by threat level first, then by date
		filtered.sort((a, b) => {
			const priorityA = THREAT_LEVEL_PRIORITY[a.threatLevel] ?? 5;
			const priorityB = THREAT_LEVEL_PRIORITY[b.threatLevel] ?? 5;
			if (priorityA !== priorityB) {
				return priorityA - priorityB;
			}
			// Within same threat level, sort by date (most recent first)
			const dateA = new Date(a.timestamp).getTime();
			const dateB = new Date(b.timestamp).getTime();
			return dateB - dateA;
		});

		return filtered;
	}
);

// Helper functions (exported for use in components)
export function addEvent(event: ThreatEvent) {
	events.update((current) => [event, ...current].slice(0, 1000));
}

export function addEvents(newEvents: ThreatEvent[]) {
	events.update((current) => [...newEvents, ...current].slice(0, 1000));
}

export function clearFilters() {
	timeRange.set(null);
	categoryFilters.set([]);
	threatLevelFilters.set([]);
	searchQuery.set('');
}

// Fetch events from API
export async function fetchEvents(accessToken?: string) {
	isLoading.set(true);
	error.set(null);

	try {
		const url = new URL('/api/events', window.location.origin);
		if (accessToken) {
			url.searchParams.set('accessToken', accessToken);
		}

		const response = await fetch(url.toString());

		if (!response.ok) {
			const data = await response.json();
			if (data.requiresReauth) {
				error.set('Authentication required');
				return { requiresReauth: true };
			}
			throw new Error(data.error || 'Failed to fetch events');
		}

		const data = await response.json();
		events.set(data.events || []);
		return { requiresReauth: false };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch events';
		error.set(message);
		console.error('Error fetching events:', err);
		return { requiresReauth: false };
	} finally {
		isLoading.set(false);
	}
}

// Auto-refresh functionality
export function setupAutoRefresh(intervalMs: number = 300000, accessToken?: string) {
	// Initial fetch
	fetchEvents(accessToken);

	// Set up interval
	const interval = setInterval(() => {
		fetchEvents(accessToken);
	}, intervalMs);

	// Return cleanup function
	return () => clearInterval(interval);
}

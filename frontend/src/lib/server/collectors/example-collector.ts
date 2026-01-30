/**
 * Example collector demonstrating how to use the event processor
 * with different data source types.
 */

import type { Topic } from '../db/schema';
import {
	processCollectedItems,
	initCollectorState,
	getCollectorState,
	getSourcesDueForCollection
} from '../db/collector';
import {
	processRawInput,
	processRawInputs,
	isLikelyRelevant,
	type RawTextInput,
	type RawRSSItem,
	type RawAPIResponse
} from '../event-processor';

// ============================================================================
// EXAMPLE 1: Processing raw text
// ============================================================================

export async function processRawText(topic: Topic, text: string, source?: string) {
	const input: RawTextInput = {
		type: 'text',
		content: text,
		source_name: source || 'manual',
		published_at: new Date().toISOString()
	};

	const keywords = ['nipah', 'outbreak', 'virus']; // Topic-specific keywords

	const processed = await processRawInput(topic, input, keywords);

	if (processed) {
		const result = processCollectedItems(topic, source || 'manual-input', [processed]);
		console.log(`Processed: ${result.newItems} new, ${result.duplicates} duplicates`);
		console.log(`Next collection: ${result.nextCollectionAt} (${result.frequencyTier})`);
		return result;
	}

	return null;
}

// ============================================================================
// EXAMPLE 2: Processing RSS feed items
// ============================================================================

interface RSSFeedItem {
	title: string;
	description?: string;
	'content:encoded'?: string;
	link: string;
	pubDate?: string;
}

export async function processRSSFeed(
	topic: Topic,
	feedUrl: string,
	feedName: string,
	items: RSSFeedItem[],
	keywords: string[]
) {
	// Initialize collector state if first run
	let state = getCollectorState(topic, feedUrl);
	if (!state) {
		initCollectorState(topic, feedUrl, 'rss', keywords);
	}

	// Pre-filter by keywords for efficiency
	const relevantItems = items.filter((item) => {
		const text = `${item.title} ${item.description || ''} ${item['content:encoded'] || ''}`;
		return isLikelyRelevant(text, keywords);
	});

	console.log(`Filtered ${items.length} items to ${relevantItems.length} relevant`);

	// Convert to raw inputs
	const rawInputs: RawRSSItem[] = relevantItems.map((item) => ({
		type: 'rss' as const,
		title: item.title,
		description: item.description,
		content: item['content:encoded'],
		link: item.link,
		pubDate: item.pubDate,
		source_name: feedName
	}));

	// Process and extract structured data
	const processed = await processRawInputs(topic, rawInputs, keywords);

	// Store in database with deduplication
	const result = processCollectedItems(topic, feedUrl, processed);

	console.log(`RSS feed ${feedName}: ${result.newItems} new, ${result.duplicates} duplicates`);
	console.log(`Next fetch: ${result.nextCollectionAt} (tier: ${result.frequencyTier})`);

	return result;
}

// ============================================================================
// EXAMPLE 3: Processing API responses (e.g., Valyu API)
// ============================================================================

interface ValyuSearchResult {
	title: string;
	content: string;
	url: string;
	source?: string;
	published_date?: string;
}

export async function processValyuResults(
	topic: Topic,
	sourceName: string,
	results: ValyuSearchResult[],
	keywords: string[]
) {
	// Initialize collector state
	let state = getCollectorState(topic, sourceName);
	if (!state) {
		initCollectorState(topic, sourceName, 'api', keywords);
	}

	// Convert to raw inputs
	const rawInputs: RawAPIResponse[] = results.map((result) => ({
		type: 'api' as const,
		title: result.title,
		content: result.content,
		url: result.url,
		source: result.source,
		date: result.published_date
	}));

	// Process and extract
	const processed = await processRawInputs(topic, rawInputs, keywords);

	// Store with deduplication
	const result = processCollectedItems(topic, sourceName, processed);

	return result;
}

// ============================================================================
// EXAMPLE 4: Scheduled collection runner
// ============================================================================

type CollectorFunction = (topic: Topic, source: string, keywords: string[]) => Promise<void>;

const collectors: Record<string, CollectorFunction> = {
	// Register your collectors here
	// 'valyu-nipah': async (topic, source, keywords) => { ... },
	// 'rss-who': async (topic, source, keywords) => { ... },
};

export async function runDueCollections(topic: Topic) {
	const dueSources = getSourcesDueForCollection(topic);

	console.log(`Found ${dueSources.length} sources due for collection`);

	for (const source of dueSources) {
		const collector = collectors[source.source];
		if (collector) {
			try {
				const keywords = source.keywords ? JSON.parse(source.keywords) : [];
				await collector(topic, source.source, keywords);
			} catch (error) {
				console.error(`Error collecting from ${source.source}:`, error);
			}
		} else {
			console.warn(`No collector registered for source: ${source.source}`);
		}
	}
}

// ============================================================================
// EXAMPLE 5: Full pipeline with Valyu API integration
// ============================================================================

import { Valyu } from 'valyu-js';

export async function collectFromValyu(
	topic: Topic,
	query: string,
	keywords: string[]
) {
	const sourceName = `valyu-${topic}-${query.replace(/\s+/g, '-').toLowerCase()}`;

	// Initialize if needed
	let state = getCollectorState(topic, sourceName);
	if (!state) {
		initCollectorState(topic, sourceName, 'api', keywords);
	}

	// Skip if not due yet
	if (state && state.next_collection_at) {
		const nextAt = new Date(state.next_collection_at);
		if (nextAt > new Date()) {
			console.log(`Skipping ${sourceName}, next collection at ${nextAt}`);
			return null;
		}
	}

	try {
		// Fetch from Valyu
		const apiKey = process.env.VALYU_API_KEY;
		if (!apiKey) {
			throw new Error('VALYU_API_KEY not set');
		}

		const valyu = new Valyu(apiKey);
		const response = await valyu.search(query, {
			searchType: 'web',
			maxNumResults: 20
		});

		if (!response.results || !Array.isArray(response.results)) {
			console.log(`No results from Valyu for query: ${query}`);
			return processCollectedItems(topic, sourceName, []);
		}

		// Process results
		const rawInputs: RawAPIResponse[] = response.results.map((item: any) => ({
			type: 'api' as const,
			title: item.title,
			content: item.content,
			url: item.url,
			source: item.source,
			date: item.published_date
		}));

		const processed = await processRawInputs(topic, rawInputs, keywords);
		const result = processCollectedItems(topic, sourceName, processed);

		console.log(`Valyu [${query}]: ${result.newItems} new, ${result.duplicates} dups`);
		return result;
	} catch (error) {
		console.error(`Valyu collection error for ${query}:`, error);
		return null;
	}
}

import { createHash } from 'crypto';
import { getDatabase, type Topic } from './index';
import { FREQUENCY_TIERS, type FrequencyTier } from './schema';
import type { ThreatLevel } from '$lib/types';

export interface CollectedItem {
	id?: string;
	title: string;
	content?: string;
	summary?: string;
	source_url?: string;
	source_name?: string;
	location_name?: string;
	latitude?: number;
	longitude?: number;
	country?: string;
	country_code?: string;
	threat_level?: ThreatLevel;
	category?: string;
	tags?: string[];
	keywords?: string[];
	timestamp?: Date | string;
	metadata?: Record<string, unknown>;
}

export interface CollectionResult {
	newItems: number;
	duplicates: number;
	total: number;
	nextCollectionAt: Date;
	frequencyTier: FrequencyTier;
}

export interface CollectorState {
	source: string;
	source_type: 'rss' | 'api' | 'scraper';
	keywords: string | null;
	last_cursor: string | null;
	last_item_id: string | null;
	last_collected_at: string | null;
	last_new_item_at: string | null;
	items_collected: number;
	items_duplicates: number;
	consecutive_empty: number;
	frequency_tier: FrequencyTier;
	current_interval_minutes: number;
	next_collection_at: string | null;
}

/**
 * Generate a content hash for deduplication
 * Uses normalized title + first 500 chars of content
 */
export function generateContentHash(item: CollectedItem): string {
	const normalizedTitle = item.title.toLowerCase().trim().replace(/\s+/g, ' ');
	const contentPreview = (item.content || '').slice(0, 500).toLowerCase().trim().replace(/\s+/g, ' ');
	const hashInput = `${normalizedTitle}|${contentPreview}`;
	return createHash('sha256').update(hashInput).digest('hex').slice(0, 32);
}

/**
 * Check if content hash already exists
 */
export function isContentDuplicate(topic: Topic, hash: string): { isDuplicate: boolean; originalEventId?: string } {
	const db = getDatabase(topic);
	const existing = db.prepare('SELECT event_id FROM content_hashes WHERE hash = ?').get(hash) as { event_id: string } | undefined;

	if (existing) {
		return { isDuplicate: true, originalEventId: existing.event_id };
	}
	return { isDuplicate: false };
}

/**
 * Calculate similarity between two strings (Jaccard similarity on words)
 */
export function calculateSimilarity(text1: string, text2: string): number {
	const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
	const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 3));

	if (words1.size === 0 || words2.size === 0) return 0;

	const intersection = new Set([...words1].filter(w => words2.has(w)));
	const union = new Set([...words1, ...words2]);

	return intersection.size / union.size;
}

/**
 * Find similar content in database (for fuzzy deduplication)
 */
export function findSimilarContent(topic: Topic, item: CollectedItem, threshold: number = 0.7): { isSimilar: boolean; similarEventId?: string; similarity?: number } {
	const db = getDatabase(topic);

	// Get recent events to compare against (last 24 hours)
	const recentEvents = db.prepare(`
		SELECT id, title, content FROM events
		WHERE collected_at > datetime('now', '-1 day')
		AND is_duplicate = 0
		ORDER BY collected_at DESC
		LIMIT 100
	`).all() as { id: string; title: string; content: string }[];

	const itemText = `${item.title} ${item.content || ''}`;

	for (const event of recentEvents) {
		const eventText = `${event.title} ${event.content || ''}`;
		const similarity = calculateSimilarity(itemText, eventText);

		if (similarity >= threshold) {
			return { isSimilar: true, similarEventId: event.id, similarity };
		}
	}

	return { isSimilar: false };
}

/**
 * Get or create collector state
 */
export function getCollectorState(topic: Topic, source: string): CollectorState | null {
	const db = getDatabase(topic);
	return db.prepare('SELECT * FROM collection_state WHERE source = ?').get(source) as CollectorState | null;
}

/**
 * Initialize collector state for a new source
 */
export function initCollectorState(
	topic: Topic,
	source: string,
	sourceType: 'rss' | 'api' | 'scraper',
	keywords?: string[]
): void {
	const db = getDatabase(topic);

	db.prepare(`
		INSERT OR IGNORE INTO collection_state (
			source, source_type, keywords, frequency_tier, current_interval_minutes, next_collection_at
		) VALUES (?, ?, ?, 'active', 10, datetime('now'))
	`).run(source, sourceType, keywords ? JSON.stringify(keywords) : null);
}

/**
 * Determine next frequency tier based on collection results
 */
function getNextFrequencyTier(currentTier: FrequencyTier, hasNewItems: boolean, consecutiveEmpty: number): FrequencyTier {
	if (hasNewItems) {
		return 'active';
	}

	// Progress through tiers based on consecutive empty collections
	if (consecutiveEmpty >= 6) return 'dormant';   // 6+ empty = 2 hours
	if (consecutiveEmpty >= 3) return 'idle';      // 3-5 empty = 60 min
	if (consecutiveEmpty >= 1) return 'slowing';   // 1-2 empty = 30 min

	return currentTier;
}

/**
 * Process collected items with deduplication and adaptive frequency
 */
export function processCollectedItems(
	topic: Topic,
	source: string,
	items: CollectedItem[],
	cursor?: string
): CollectionResult {
	const db = getDatabase(topic);

	let state = getCollectorState(topic, source);
	if (!state) {
		initCollectorState(topic, source, 'api');
		state = getCollectorState(topic, source)!;
	}

	let newItems = 0;
	let duplicates = 0;

	const insertEvent = db.prepare(`
		INSERT INTO events (
			id, title, content, summary, source_url, source_name,
			location_name, latitude, longitude, country, country_code,
			threat_level, category, tags, keywords, timestamp, content_hash,
			is_duplicate, duplicate_of, metadata
		) VALUES (
			@id, @title, @content, @summary, @source_url, @source_name,
			@location_name, @latitude, @longitude, @country, @country_code,
			@threat_level, @category, @tags, @keywords, @timestamp, @content_hash,
			@is_duplicate, @duplicate_of, @metadata
		)
	`);

	const insertHash = db.prepare(`
		INSERT OR IGNORE INTO content_hashes (hash, event_id) VALUES (?, ?)
	`);

	const transaction = db.transaction(() => {
		for (const item of items) {
			const contentHash = generateContentHash(item);
			const id = item.id || `${source}-${contentHash.slice(0, 16)}-${Date.now()}`;

			// Check exact duplicate by hash
			const { isDuplicate, originalEventId } = isContentDuplicate(topic, contentHash);

			if (isDuplicate) {
				duplicates++;
				continue;
			}

			// Check similar content (fuzzy deduplication)
			const { isSimilar, similarEventId } = findSimilarContent(topic, item, 0.75);

			if (isSimilar) {
				// Store as duplicate but mark the relationship
				insertEvent.run({
					id,
					title: item.title,
					content: item.content ?? null,
					summary: item.summary ?? null,
					source_url: item.source_url ?? null,
					source_name: item.source_name ?? source,
					location_name: item.location_name ?? null,
					latitude: item.latitude ?? null,
					longitude: item.longitude ?? null,
					country: item.country ?? null,
					country_code: item.country_code ?? null,
					threat_level: item.threat_level ?? null,
					category: item.category ?? null,
					tags: item.tags ? JSON.stringify(item.tags) : null,
					keywords: item.keywords ? JSON.stringify(item.keywords) : null,
					timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp ?? null,
					content_hash: contentHash,
					is_duplicate: 1,
					duplicate_of: similarEventId,
					metadata: item.metadata ? JSON.stringify(item.metadata) : null
				});
				insertHash.run(contentHash, id);
				duplicates++;
				continue;
			}

			// New unique item
			insertEvent.run({
				id,
				title: item.title,
				content: item.content ?? null,
				summary: item.summary ?? null,
				source_url: item.source_url ?? null,
				source_name: item.source_name ?? source,
				location_name: item.location_name ?? null,
				latitude: item.latitude ?? null,
				longitude: item.longitude ?? null,
				country: item.country ?? null,
				country_code: item.country_code ?? null,
				threat_level: item.threat_level ?? null,
				category: item.category ?? null,
				tags: item.tags ? JSON.stringify(item.tags) : null,
				keywords: item.keywords ? JSON.stringify(item.keywords) : null,
				timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp ?? null,
				content_hash: contentHash,
				is_duplicate: 0,
				duplicate_of: null,
				metadata: item.metadata ? JSON.stringify(item.metadata) : null
			});
			insertHash.run(contentHash, id);
			newItems++;
		}
	});

	transaction();

	// Update collector state with adaptive frequency
	const hasNewItems = newItems > 0;
	const consecutiveEmpty = hasNewItems ? 0 : state.consecutive_empty + 1;
	const nextTier = getNextFrequencyTier(state.frequency_tier as FrequencyTier, hasNewItems, consecutiveEmpty);
	const nextInterval = FREQUENCY_TIERS[nextTier];
	const nextCollectionAt = new Date(Date.now() + nextInterval * 60 * 1000);

	db.prepare(`
		UPDATE collection_state SET
			last_cursor = @cursor,
			last_collected_at = CURRENT_TIMESTAMP,
			last_new_item_at = CASE WHEN @hasNew = 1 THEN CURRENT_TIMESTAMP ELSE last_new_item_at END,
			items_collected = items_collected + @newItems,
			items_duplicates = items_duplicates + @duplicates,
			consecutive_empty = @consecutiveEmpty,
			frequency_tier = @tier,
			current_interval_minutes = @interval,
			next_collection_at = @nextAt
		WHERE source = @source
	`).run({
		source,
		cursor: cursor ?? null,
		hasNew: hasNewItems ? 1 : 0,
		newItems,
		duplicates,
		consecutiveEmpty,
		tier: nextTier,
		interval: nextInterval,
		nextAt: nextCollectionAt.toISOString()
	});

	return {
		newItems,
		duplicates,
		total: items.length,
		nextCollectionAt,
		frequencyTier: nextTier
	};
}

/**
 * Get sources due for collection
 */
export function getSourcesDueForCollection(topic: Topic): CollectorState[] {
	const db = getDatabase(topic);
	return db.prepare(`
		SELECT * FROM collection_state
		WHERE next_collection_at <= datetime('now')
		ORDER BY next_collection_at ASC
	`).all() as CollectorState[];
}

/**
 * Get all collector states for a topic
 */
export function getAllCollectorStates(topic: Topic): CollectorState[] {
	const db = getDatabase(topic);
	return db.prepare('SELECT * FROM collection_state ORDER BY last_collected_at DESC').all() as CollectorState[];
}

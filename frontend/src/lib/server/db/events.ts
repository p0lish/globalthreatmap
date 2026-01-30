import { getDatabase, type Topic } from './index';
import type { ThreatLevel } from '$lib/types';

export interface DbEvent {
	id: string;
	title: string;
	content: string | null;
	summary: string | null;
	source_url: string | null;
	source_name: string | null;
	location_name: string | null;
	latitude: number | null;
	longitude: number | null;
	country: string | null;
	country_code: string | null;
	threat_level: ThreatLevel | null;
	category: string | null;
	tags: string | null;
	keywords: string | null;
	timestamp: string | null;
	collected_at: string;
	updated_at: string;
	content_hash: string | null;
	is_duplicate: number;
	duplicate_of: string | null;
	metadata: string | null;
}

export interface InsertEvent {
	id: string;
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
	content_hash?: string;
	is_duplicate?: boolean;
	duplicate_of?: string;
	metadata?: Record<string, unknown>;
}

export function insertEvent(topic: Topic, event: InsertEvent): void {
	const db = getDatabase(topic);

	const stmt = db.prepare(`
    INSERT OR REPLACE INTO events (
      id, title, content, summary, source_url, source_name,
      location_name, latitude, longitude, country, country_code,
      threat_level, category, tags, timestamp, metadata, updated_at
    ) VALUES (
      @id, @title, @content, @summary, @source_url, @source_name,
      @location_name, @latitude, @longitude, @country, @country_code,
      @threat_level, @category, @tags, @timestamp, @metadata, CURRENT_TIMESTAMP
    )
  `);

	stmt.run({
		id: event.id,
		title: event.title,
		content: event.content ?? null,
		summary: event.summary ?? null,
		source_url: event.source_url ?? null,
		source_name: event.source_name ?? null,
		location_name: event.location_name ?? null,
		latitude: event.latitude ?? null,
		longitude: event.longitude ?? null,
		country: event.country ?? null,
		country_code: event.country_code ?? null,
		threat_level: event.threat_level ?? null,
		category: event.category ?? null,
		tags: event.tags ? JSON.stringify(event.tags) : null,
		timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp ?? null,
		metadata: event.metadata ? JSON.stringify(event.metadata) : null
	});
}

export function insertEvents(topic: Topic, events: InsertEvent[]): number {
	const db = getDatabase(topic);

	const stmt = db.prepare(`
    INSERT OR IGNORE INTO events (
      id, title, content, summary, source_url, source_name,
      location_name, latitude, longitude, country, country_code,
      threat_level, category, tags, timestamp, metadata
    ) VALUES (
      @id, @title, @content, @summary, @source_url, @source_name,
      @location_name, @latitude, @longitude, @country, @country_code,
      @threat_level, @category, @tags, @timestamp, @metadata
    )
  `);

	const insertMany = db.transaction((events: InsertEvent[]) => {
		let inserted = 0;
		for (const event of events) {
			const result = stmt.run({
				id: event.id,
				title: event.title,
				content: event.content ?? null,
				summary: event.summary ?? null,
				source_url: event.source_url ?? null,
				source_name: event.source_name ?? null,
				location_name: event.location_name ?? null,
				latitude: event.latitude ?? null,
				longitude: event.longitude ?? null,
				country: event.country ?? null,
				country_code: event.country_code ?? null,
				threat_level: event.threat_level ?? null,
				category: event.category ?? null,
				tags: event.tags ? JSON.stringify(event.tags) : null,
				timestamp: event.timestamp instanceof Date ? event.timestamp.toISOString() : event.timestamp ?? null,
				metadata: event.metadata ? JSON.stringify(event.metadata) : null
			});
			if (result.changes > 0) inserted++;
		}
		return inserted;
	});

	return insertMany(events);
}

export function getEventById(topic: Topic, id: string): DbEvent | null {
	const db = getDatabase(topic);
	return db.prepare('SELECT * FROM events WHERE id = ?').get(id) as DbEvent | null;
}

export function getEventByUrl(topic: Topic, url: string): DbEvent | null {
	const db = getDatabase(topic);
	return db.prepare('SELECT * FROM events WHERE source_url = ?').get(url) as DbEvent | null;
}

export interface QueryOptions {
	limit?: number;
	offset?: number;
	threatLevel?: ThreatLevel;
	country_code?: string;
	keywords?: string[];
	since?: Date | string;
	until?: Date | string;
	includeDuplicates?: boolean;
	orderBy?: 'timestamp' | 'collected_at';
	order?: 'ASC' | 'DESC';
}

export function queryEvents(topic: Topic, options: QueryOptions = {}): DbEvent[] {
	const db = getDatabase(topic);

	const {
		limit = 100,
		offset = 0,
		threatLevel,
		country_code,
		keywords,
		since,
		until,
		includeDuplicates = false,
		orderBy = 'timestamp',
		order = 'DESC'
	} = options;

	const conditions: string[] = [];
	const params: Record<string, unknown> = {};

	// Filter out duplicates by default
	if (!includeDuplicates) {
		conditions.push('is_duplicate = 0');
	}

	if (threatLevel) {
		conditions.push('threat_level = @threatLevel');
		params.threatLevel = threatLevel;
	}

	if (country_code) {
		conditions.push('country_code = @country_code');
		params.country_code = country_code;
	}

	if (keywords && keywords.length > 0) {
		const keywordConditions = keywords.map((_, i) => `keywords LIKE @kw${i}`);
		conditions.push(`(${keywordConditions.join(' OR ')})`);
		keywords.forEach((kw, i) => {
			params[`kw${i}`] = `%${kw}%`;
		});
	}

	if (since) {
		conditions.push('timestamp >= @since');
		params.since = since instanceof Date ? since.toISOString() : since;
	}

	if (until) {
		conditions.push('timestamp <= @until');
		params.until = until instanceof Date ? until.toISOString() : until;
	}

	const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

	const sql = `
    SELECT * FROM events
    ${whereClause}
    ORDER BY ${orderBy} ${order}
    LIMIT @limit OFFSET @offset
  `;

	params.limit = limit;
	params.offset = offset;

	return db.prepare(sql).all(params) as DbEvent[];
}

export function countEvents(topic: Topic): number {
	const db = getDatabase(topic);
	const result = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
	return result.count;
}

export function getLatestEventTimestamp(topic: Topic): string | null {
	const db = getDatabase(topic);
	const result = db.prepare('SELECT MAX(timestamp) as latest FROM events').get() as { latest: string | null };
	return result.latest;
}

export function deleteEvent(topic: Topic, id: string): boolean {
	const db = getDatabase(topic);
	const result = db.prepare('DELETE FROM events WHERE id = ?').run(id);
	return result.changes > 0;
}

export function eventExists(topic: Topic, id: string): boolean {
	const db = getDatabase(topic);
	const result = db.prepare('SELECT 1 FROM events WHERE id = ? LIMIT 1').get(id);
	return result !== undefined;
}

export function urlExists(topic: Topic, url: string): boolean {
	const db = getDatabase(topic);
	const result = db.prepare('SELECT 1 FROM events WHERE source_url = ? LIMIT 1').get(url);
	return result !== undefined;
}

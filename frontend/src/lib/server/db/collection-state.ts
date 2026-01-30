import { getDatabase, type Topic } from './index';

export interface CollectionState {
	source: string;
	last_cursor: string | null;
	last_item_id: string | null;
	last_collected_at: string | null;
	items_collected: number;
	metadata: string | null; // JSON string
}

export function getCollectionState(topic: Topic, source: string): CollectionState | null {
	const db = getDatabase(topic);
	return db.prepare('SELECT * FROM collection_state WHERE source = ?').get(source) as CollectionState | null;
}

export function updateCollectionState(
	topic: Topic,
	source: string,
	updates: {
		last_cursor?: string;
		last_item_id?: string;
		items_collected?: number;
		metadata?: Record<string, unknown>;
	}
): void {
	const db = getDatabase(topic);

	const existing = getCollectionState(topic, source);

	if (existing) {
		const sets: string[] = ['last_collected_at = CURRENT_TIMESTAMP'];
		const params: Record<string, unknown> = { source };

		if (updates.last_cursor !== undefined) {
			sets.push('last_cursor = @last_cursor');
			params.last_cursor = updates.last_cursor;
		}

		if (updates.last_item_id !== undefined) {
			sets.push('last_item_id = @last_item_id');
			params.last_item_id = updates.last_item_id;
		}

		if (updates.items_collected !== undefined) {
			sets.push('items_collected = items_collected + @items_collected');
			params.items_collected = updates.items_collected;
		}

		if (updates.metadata !== undefined) {
			sets.push('metadata = @metadata');
			params.metadata = JSON.stringify(updates.metadata);
		}

		db.prepare(`UPDATE collection_state SET ${sets.join(', ')} WHERE source = @source`).run(params);
	} else {
		db.prepare(`
      INSERT INTO collection_state (source, last_cursor, last_item_id, last_collected_at, items_collected, metadata)
      VALUES (@source, @last_cursor, @last_item_id, CURRENT_TIMESTAMP, @items_collected, @metadata)
    `).run({
			source,
			last_cursor: updates.last_cursor ?? null,
			last_item_id: updates.last_item_id ?? null,
			items_collected: updates.items_collected ?? 0,
			metadata: updates.metadata ? JSON.stringify(updates.metadata) : null
		});
	}
}

export function resetCollectionState(topic: Topic, source: string): void {
	const db = getDatabase(topic);
	db.prepare('DELETE FROM collection_state WHERE source = ?').run(source);
}

export function getAllCollectionStates(topic: Topic): CollectionState[] {
	const db = getDatabase(topic);
	return db.prepare('SELECT * FROM collection_state ORDER BY last_collected_at DESC').all() as CollectionState[];
}

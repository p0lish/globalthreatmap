import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { existsSync } from 'fs';
import { join } from 'path';
import { TOPICS, FULL_SCHEMA, type Topic } from './schema';

const DATA_DIR = join(process.cwd(), 'data');

const connections = new Map<Topic, DatabaseType>();

export function getDatabase(topic: Topic): DatabaseType {
	if (!TOPICS.includes(topic)) {
		throw new Error(`Invalid topic: ${topic}. Must be one of: ${TOPICS.join(', ')}`);
	}

	// Return cached connection if exists
	if (connections.has(topic)) {
		return connections.get(topic)!;
	}

	const dbPath = join(DATA_DIR, `${topic}.db`);

	// Check if database exists
	if (!existsSync(dbPath)) {
		throw new Error(
			`Database not found: ${dbPath}. Run 'npm run db:setup' to initialize databases.`
		);
	}

	const db = new Database(dbPath);
	db.pragma('journal_mode = WAL');

	connections.set(topic, db);
	return db;
}

export function closeDatabase(topic: Topic): void {
	const db = connections.get(topic);
	if (db) {
		db.close();
		connections.delete(topic);
	}
}

export function closeAllDatabases(): void {
	for (const [topic, db] of connections) {
		db.close();
		connections.delete(topic);
	}
}

export { TOPICS, type Topic } from './schema';

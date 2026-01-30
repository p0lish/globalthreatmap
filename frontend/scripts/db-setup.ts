import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const TOPICS = ['cybersec', 'diseases', 'military', 'geopolitics'] as const;

const EVENTS_TABLE_SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  summary TEXT,
  source_url TEXT,
  source_name TEXT,
  location_name TEXT,
  latitude REAL,
  longitude REAL,
  country TEXT,
  country_code TEXT,
  threat_level TEXT CHECK(threat_level IN ('critical', 'high', 'medium', 'low', 'info')),
  category TEXT,
  tags TEXT,
  keywords TEXT,
  timestamp DATETIME,
  collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  content_hash TEXT,
  is_duplicate INTEGER DEFAULT 0,
  duplicate_of TEXT,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_threat_level ON events(threat_level);
CREATE INDEX IF NOT EXISTS idx_events_country_code ON events(country_code);
CREATE INDEX IF NOT EXISTS idx_events_collected_at ON events(collected_at);
CREATE INDEX IF NOT EXISTS idx_events_content_hash ON events(content_hash);
CREATE INDEX IF NOT EXISTS idx_events_keywords ON events(keywords);
`;

const COLLECTION_STATE_TABLE_SCHEMA = `
CREATE TABLE IF NOT EXISTS collection_state (
  source TEXT PRIMARY KEY,
  source_type TEXT CHECK(source_type IN ('rss', 'api', 'scraper')),
  keywords TEXT,
  last_cursor TEXT,
  last_item_id TEXT,
  last_collected_at DATETIME,
  last_new_item_at DATETIME,
  items_collected INTEGER DEFAULT 0,
  items_duplicates INTEGER DEFAULT 0,
  consecutive_empty INTEGER DEFAULT 0,
  frequency_tier TEXT DEFAULT 'active',
  current_interval_minutes INTEGER DEFAULT 10,
  next_collection_at DATETIME,
  metadata TEXT
);
`;

const SOURCES_TABLE_SCHEMA = `
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  type TEXT CHECK(type IN ('rss', 'api', 'scraper', 'manual')),
  enabled INTEGER DEFAULT 1,
  keywords TEXT,
  config TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

const CONTENT_HASHES_TABLE_SCHEMA = `
CREATE TABLE IF NOT EXISTS content_hashes (
  hash TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_hashes_event ON content_hashes(event_id);
`;

function setupDatabase(topic: string): void {
	const dbPath = join(DATA_DIR, `${topic}.db`);
	console.log(`Setting up database: ${dbPath}`);

	const db = new Database(dbPath);

	// Enable WAL mode for better concurrent access
	db.pragma('journal_mode = WAL');

	// Execute schema
	db.exec(EVENTS_TABLE_SCHEMA);
	db.exec(COLLECTION_STATE_TABLE_SCHEMA);
	db.exec(SOURCES_TABLE_SCHEMA);
	db.exec(CONTENT_HASHES_TABLE_SCHEMA);

	// Verify tables exist
	const tables = db
		.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
		.all() as { name: string }[];

	console.log(`  Tables: ${tables.map((t) => t.name).join(', ')}`);

	db.close();
	console.log(`  Done.\n`);
}

function main(): void {
	console.log('='.repeat(50));
	console.log('Global Threat Map - Database Setup');
	console.log('='.repeat(50));
	console.log();

	// Create data directory if it doesn't exist
	if (!existsSync(DATA_DIR)) {
		console.log(`Creating data directory: ${DATA_DIR}`);
		mkdirSync(DATA_DIR, { recursive: true });
	}

	// Setup each topic database
	for (const topic of TOPICS) {
		setupDatabase(topic);
	}

	console.log('All databases initialized successfully!');
	console.log(`\nDatabase files location: ${DATA_DIR}`);
}

main();

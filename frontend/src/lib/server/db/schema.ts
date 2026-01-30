export const TOPICS = ['cybersec', 'diseases', 'military', 'geopolitics'] as const;
export type Topic = (typeof TOPICS)[number];

// Adaptive frequency tiers (in minutes)
export const FREQUENCY_TIERS = {
	active: 10,      // New info appearing
	slowing: 30,     // No new info, possible duplicates
	idle: 60,        // No updates
	dormant: 120     // Extended no updates
} as const;

export type FrequencyTier = keyof typeof FREQUENCY_TIERS;

export const EVENTS_TABLE_SCHEMA = `
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

export const COLLECTION_STATE_TABLE_SCHEMA = `
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

export const SOURCES_TABLE_SCHEMA = `
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

export const CONTENT_HASHES_TABLE_SCHEMA = `
CREATE TABLE IF NOT EXISTS content_hashes (
  hash TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE INDEX IF NOT EXISTS idx_content_hashes_event ON content_hashes(event_id);
`;

export const FULL_SCHEMA = `
${EVENTS_TABLE_SCHEMA}
${COLLECTION_STATE_TABLE_SCHEMA}
${SOURCES_TABLE_SCHEMA}
${CONTENT_HASHES_TABLE_SCHEMA}
`;

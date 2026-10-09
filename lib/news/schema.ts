export const NEWS_SCHEMA = `
CREATE TABLE IF NOT EXISTS news_items (
 id TEXT PRIMARY KEY, url TEXT NOT NULL UNIQUE, source_id TEXT NOT NULL,
 source_title TEXT NOT NULL, published_at TEXT NOT NULL, fetched_at TEXT NOT NULL,
 category TEXT NOT NULL, tool_ids TEXT NOT NULL,
 manual_title TEXT, summary TEXT, takeaway TEXT, reviewed INTEGER NOT NULL DEFAULT 0,
 hidden INTEGER NOT NULL DEFAULT 0, edited_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_news_publication ON news_items(published_at DESC);
CREATE TABLE IF NOT EXISTS news_source_state (
 id TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'pending', attempted_at TEXT,
 succeeded_at TEXT, etag TEXT, modified TEXT, item_count INTEGER NOT NULL DEFAULT 0, error TEXT
);
CREATE TABLE IF NOT EXISTS news_refresh_lock (
 id INTEGER PRIMARY KEY CHECK (id=1), token TEXT NOT NULL, until_ms INTEGER NOT NULL
);
`

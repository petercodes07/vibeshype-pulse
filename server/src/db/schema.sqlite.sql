CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY, handle TEXT, name TEXT NOT NULL, description TEXT,
  thumbnail_url TEXT, subscriber_count INTEGER, video_count INTEGER, country TEXT,
  combined_text TEXT, embedding TEXT, embedded_at TEXT,
  fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY, channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT, transcript TEXT, combined_text TEXT,
  view_count INTEGER, like_count INTEGER, comment_count INTEGER, duration TEXT,
  published_at TEXT, fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS videos_channel_id_idx ON videos(channel_id);
CREATE TABLE IF NOT EXISTS recommended_competitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  target_channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  score REAL NOT NULL, reason TEXT, generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_channel_id, target_channel_id)
);
CREATE INDEX IF NOT EXISTS rec_source_idx ON recommended_competitors(source_channel_id);

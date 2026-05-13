-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Channels ────────────────────────────────────────────────────────────────
-- One row per YouTube channel we've indexed.
CREATE TABLE IF NOT EXISTS channels (
  id              TEXT PRIMARY KEY,          -- YouTube channel ID (UCxxxxxxx)
  handle          TEXT,                      -- @handle if available
  name            TEXT NOT NULL,
  description     TEXT,
  thumbnail_url   TEXT,
  subscriber_count BIGINT,
  video_count     INT,
  country         TEXT,
  combined_text   TEXT,                      -- aggregated title+desc+transcript
  embedding       vector(1536),              -- OpenAI text-embedding-3-small
  embedded_at     TIMESTAMPTZ,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ANN index for cosine similarity search
CREATE INDEX IF NOT EXISTS channels_embedding_idx
  ON channels USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ── Videos ──────────────────────────────────────────────────────────────────
-- Latest ~20 videos per channel, with transcript data.
CREATE TABLE IF NOT EXISTS videos (
  id              TEXT PRIMARY KEY,          -- YouTube video ID
  channel_id      TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  transcript      TEXT,
  combined_text   TEXT,                      -- title + description + transcript
  view_count      BIGINT,
  like_count      BIGINT,
  comment_count   BIGINT,
  duration        TEXT,                      -- ISO 8601 (PT4M13S)
  published_at    TIMESTAMPTZ,
  fetched_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS videos_channel_id_idx ON videos (channel_id);

-- ── Recommended Competitors ──────────────────────────────────────────────────
-- Top-N competitor recommendations for a source channel.
CREATE TABLE IF NOT EXISTS recommended_competitors (
  id              SERIAL PRIMARY KEY,
  source_channel_id   TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  target_channel_id   TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  score           FLOAT NOT NULL,            -- cosine similarity (0–1)
  reason          TEXT,                      -- AI-generated 1-sentence explanation
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_channel_id, target_channel_id)
);

CREATE INDEX IF NOT EXISTS rec_source_idx ON recommended_competitors (source_channel_id);

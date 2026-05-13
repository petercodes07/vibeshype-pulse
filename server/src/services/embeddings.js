/**
 * Embedding service — OpenAI text-embedding-3-small (1536 dims)
 *
 * Builds combined_text from a channel's videos, calls OpenAI,
 * then persists the embedding vector to the DB.
 */

import OpenAI from 'openai'
import { pool } from '../db/pool.js'

const MODEL = 'text-embedding-3-small'
// Max tokens to send — stay well under 8191 token limit
const MAX_CHARS = 24_000

let _client
function openai() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _client
}

// ── Text aggregation ─────────────────────────────────────────────────────────

/**
 * Build a single text blob from a channel's video rows.
 * Each video contributes: title · description (truncated) · transcript (truncated)
 */
export function buildCombinedText(channelMeta, videos) {
  const parts = []

  // Channel-level context
  if (channelMeta.description) {
    parts.push(`Channel description: ${channelMeta.description.slice(0, 800)}`)
  }

  // Per-video
  for (const v of videos) {
    const title = v.title ?? ''
    const desc  = (v.description ?? '').slice(0, 300)
    const trans = (v.transcript ?? '').slice(0, 800)
    parts.push(`Video: ${title}. ${desc} ${trans}`.trim())
  }

  return parts.join('\n\n').slice(0, MAX_CHARS)
}

// ── Embedding call ───────────────────────────────────────────────────────────

/**
 * Embed a text string. Returns float[] of length 1536.
 */
export async function embed(text) {
  const res = await openai().embeddings.create({ model: MODEL, input: text })
  return res.data[0].embedding
}

// ── Persist to DB ────────────────────────────────────────────────────────────

/**
 * Generate + save embedding for a channel.
 * Also saves combined_text so it's inspectable.
 */
export async function embedChannel(channelId, combinedText) {
  console.log(`[embed] Generating embedding for ${channelId} (${combinedText.length} chars)`)
  const vector = await embed(combinedText)

  // pgvector expects the array as a string like '[0.1,0.2,...]'
  const vectorStr = `[${vector.join(',')}]`

  await pool.query(
    `UPDATE channels
     SET embedding = $1, combined_text = $2, embedded_at = NOW()
     WHERE id = $3`,
    [vectorStr, combinedText, channelId],
  )

  console.log(`[embed] Saved embedding for ${channelId}`)
  return vector
}

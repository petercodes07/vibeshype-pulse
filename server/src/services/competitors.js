/**
 * Competitor discovery service
 *
 * 1. similarity search  — pgvector cosine distance, top N channels
 * 2. AI explanations    — Claude generates a 1-sentence "why" per match
 * 3. persist            — upserts into recommended_competitors
 */

import Anthropic from '@anthropic-ai/sdk'
import { pool } from '../db/pool.js'

const TOP_N = 10

let _anthropic
function anthropic() {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}

// ── Similarity search ────────────────────────────────────────────────────────

/**
 * Query pgvector for the TOP_N most similar channels to sourceChannelId.
 * Excludes the source channel itself.
 * Returns [{ id, name, thumbnail_url, subscriber_count, score }]
 */
export async function findSimilarChannels(sourceChannelId, topN = TOP_N) {
  const { rows } = await pool.query(
    `SELECT
       c.id,
       c.name,
       c.handle,
       c.thumbnail_url,
       c.subscriber_count,
       c.country,
       1 - (c.embedding <=> src.embedding) AS score
     FROM channels c
     CROSS JOIN (
       SELECT embedding FROM channels WHERE id = $1
     ) src
     WHERE c.id != $1
       AND c.embedding IS NOT NULL
     ORDER BY c.embedding <=> src.embedding
     LIMIT $2`,
    [sourceChannelId, topN],
  )
  return rows
}

// ── AI explanation ───────────────────────────────────────────────────────────

/**
 * Generate a 1-sentence explanation for why `target` is a competitor of `source`.
 */
async function generateReason(source, target) {
  const prompt = `You are an expert YouTube channel analyst.

Source channel: "${source.name}" — ${source.description?.slice(0, 300) ?? 'no description'}
Competitor channel: "${target.name}" — ${target.description?.slice(0, 300) ?? 'no description'}
Similarity score: ${(target.score * 100).toFixed(1)}%

In ONE concise sentence (max 25 words), explain WHY the competitor channel is relevant to the source channel's audience. Focus on shared niche, content style, or audience overlap. Do not mention the similarity score.`

  const msg = await anthropic().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 80,
    messages: [{ role: 'user', content: prompt }],
  })

  return msg.content[0]?.text?.trim() ?? ''
}

// ── Batch explanations ───────────────────────────────────────────────────────

/**
 * Generate reasons for all competitors concurrently (capped at 5 parallel).
 */
async function generateReasons(sourceChannel, competitors) {
  const results = []
  const queue = [...competitors]

  async function worker() {
    while (queue.length) {
      const comp = queue.shift()
      const reason = await generateReason(sourceChannel, comp).catch(() => '')
      results.push({ ...comp, reason })
    }
  }

  await Promise.all(Array.from({ length: 5 }, worker))
  return results
}

// ── Persist ──────────────────────────────────────────────────────────────────

async function persistRecommendations(sourceChannelId, competitors) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Clear stale recommendations for this source
    await client.query(
      'DELETE FROM recommended_competitors WHERE source_channel_id = $1',
      [sourceChannelId],
    )
    for (const c of competitors) {
      await client.query(
        `INSERT INTO recommended_competitors
           (source_channel_id, target_channel_id, score, reason, generated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (source_channel_id, target_channel_id)
         DO UPDATE SET score = EXCLUDED.score, reason = EXCLUDED.reason, generated_at = NOW()`,
        [sourceChannelId, c.id, c.score, c.reason],
      )
    }
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ── Main entry point ─────────────────────────────────────────────────────────

/**
 * Full pipeline: search → explain → persist → return results.
 * sourceChannel: { id, name, description }
 */
export async function buildRecommendations(sourceChannel) {
  console.log(`[competitors] Similarity search for ${sourceChannel.id}`)
  const similar = await findSimilarChannels(sourceChannel.id)

  if (!similar.length) {
    console.log('[competitors] No similar channels found yet — need more indexed channels.')
    return []
  }

  // Fetch descriptions for AI context (may be null if not stored — fine)
  const channelIds = similar.map(c => c.id)
  const { rows: details } = await pool.query(
    `SELECT id, description FROM channels WHERE id = ANY($1)`,
    [channelIds],
  )
  const descMap = Object.fromEntries(details.map(d => [d.id, d.description]))
  const enriched = similar.map(c => ({ ...c, description: descMap[c.id] ?? '' }))

  console.log(`[competitors] Generating AI reasons for ${enriched.length} channels`)
  const withReasons = await generateReasons(sourceChannel, enriched)

  await persistRecommendations(sourceChannel.id, withReasons)
  console.log(`[competitors] Saved ${withReasons.length} recommendations for ${sourceChannel.id}`)

  return withReasons
}

/**
 * POST /api/youtube/connect
 *
 * Body: { input: string }   — channel URL / @handle / video URL
 *
 * Pipeline:
 *  1. Parse input → channel ID
 *  2. Fetch channel metadata
 *  3. Fetch latest 20 video IDs
 *  4. Fetch video details (title, desc, stats)
 *  5. Fetch transcripts concurrently
 *  6. Build combined_text per video & aggregate for channel
 *  7. Save channel + videos to DB
 *  8. Generate & store embedding
 *  9. Run similarity search + AI reasons
 * 10. Return { channel, competitors }
 */

import { Router } from 'express'
import { pool } from '../db/pool.js'
import {
  parseInput,
  resolveChannelId,
  fetchChannelMeta,
  fetchLatestVideoIds,
  fetchVideoDetails,
} from '../services/youtube.js'
import { fetchTranscripts } from '../services/transcripts.js'
import { buildCombinedText, embedChannel } from '../services/embeddings.js'
import { buildRecommendations } from '../services/competitors.js'

export const youtubeRouter = Router()

youtubeRouter.post('/connect', async (req, res) => {
  const { input } = req.body ?? {}
  if (!input?.trim()) {
    return res.status(400).json({ error: 'input is required' })
  }

  try {
    // ── 1. Parse + resolve channel ID ────────────────────────────────────────
    console.log(`[connect] Input: ${input}`)
    const parsed = parseInput(input)
    const channelId = await resolveChannelId(parsed)
    console.log(`[connect] Resolved channel ID: ${channelId}`)

    // ── 2. Channel metadata ──────────────────────────────────────────────────
    const meta = await fetchChannelMeta(channelId)
    console.log(`[connect] Channel: ${meta.name}`)

    // ── 3–4. Videos ──────────────────────────────────────────────────────────
    const videoIds = await fetchLatestVideoIds(channelId, 20)
    const videoDetails = await fetchVideoDetails(videoIds)
    console.log(`[connect] Fetched ${videoDetails.length} videos`)

    // ── 5. Transcripts ───────────────────────────────────────────────────────
    const transcriptMap = await fetchTranscripts(videoIds)
    console.log(`[connect] Transcripts fetched (${[...transcriptMap.values()].filter(Boolean).length} with content)`)

    // ── 6. combined_text per video ───────────────────────────────────────────
    const videos = videoDetails.map(v => ({
      ...v,
      channel_id: channelId,
      transcript: transcriptMap.get(v.id) ?? '',
      combined_text: `${v.title} ${v.description} ${transcriptMap.get(v.id) ?? ''}`.trim(),
    }))

    const channelCombinedText = buildCombinedText(meta, videos)

    // ── 7. Persist channel + videos ──────────────────────────────────────────
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        `INSERT INTO channels (id, handle, name, description, thumbnail_url, subscriber_count, video_count, country, fetched_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
         ON CONFLICT (id) DO UPDATE SET
           name=$3, description=$4, thumbnail_url=$5,
           subscriber_count=$6, video_count=$7, country=$8, fetched_at=NOW()`,
        [meta.id, meta.handle, meta.name, meta.description,
         meta.thumbnail_url, meta.subscriber_count, meta.video_count, meta.country],
      )

      for (const v of videos) {
        await client.query(
          `INSERT INTO videos (id, channel_id, title, description, transcript, combined_text, view_count, like_count, comment_count, duration, published_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id) DO UPDATE SET
             title=$3, description=$4, transcript=$5, combined_text=$6,
             view_count=$7, like_count=$8, comment_count=$9, fetched_at=NOW()`,
          [v.id, channelId, v.title, v.description, v.transcript, v.combined_text,
           v.view_count, v.like_count, v.comment_count, v.duration, v.published_at],
        )
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
    console.log(`[connect] Saved channel + ${videos.length} videos`)

    // ── 8. Embed ─────────────────────────────────────────────────────────────
    await embedChannel(channelId, channelCombinedText)

    // ── 9. Find competitors ──────────────────────────────────────────────────
    const competitors = await buildRecommendations({ ...meta, description: meta.description })

    // ── 10. Respond ──────────────────────────────────────────────────────────
    res.json({ channel: meta, competitors })

  } catch (err) {
    console.error('[connect] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

/**
 * GET /api/competitors?channelId=UCxxxx
 *
 * Returns previously-generated recommendations for a channel.
 * If none exist, returns { competitors: [], indexed: false }.
 */

import { Router } from 'express'
import { pool } from '../db/pool.js'

export const competitorsRouter = Router()

competitorsRouter.get('/', async (req, res) => {
  const { channelId } = req.query
  if (!channelId) return res.status(400).json({ error: 'channelId is required' })

  try {
    // Check channel exists
    const { rows: [channel] } = await pool.query(
      `SELECT id, name, handle, thumbnail_url, subscriber_count, embedded_at
       FROM channels WHERE id = $1`,
      [channelId],
    )

    if (!channel) return res.json({ channel: null, competitors: [], indexed: false })

    const { rows: competitors } = await pool.query(
      `SELECT
         rc.score,
         rc.reason,
         rc.generated_at,
         c.id,
         c.name,
         c.handle,
         c.thumbnail_url,
         c.subscriber_count,
         c.country
       FROM recommended_competitors rc
       JOIN channels c ON c.id = rc.target_channel_id
       WHERE rc.source_channel_id = $1
       ORDER BY rc.score DESC`,
      [channelId],
    )

    res.json({
      channel,
      competitors,
      indexed: !!channel.embedded_at,
    })
  } catch (err) {
    console.error('[competitors] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

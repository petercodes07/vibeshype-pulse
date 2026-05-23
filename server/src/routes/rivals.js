/**
 * GET /api/rivals/activity?channelIds=UC1,UC2,UC3
 *
 * Fetches the 3 most recent videos for each tracked competitor channel
 * and returns them sorted newest-first for the activity feed.
 */

import { Router } from 'express'

export const rivalsRouter = Router()

const YT = 'https://www.googleapis.com/youtube/v3'

function ytKey() {
  if (!process.env.YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY not set')
  return process.env.YOUTUBE_API_KEY
}

async function ytGet(path, params) {
  const url = new URL(`${YT}/${path}`)
  url.searchParams.set('key', ytKey())
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`YouTube ${path} ${res.status}: ${text}`)
  }
  return res.json()
}

async function getRecentVideos(channelId, maxResults = 3) {
  try {
    const data = await ytGet('search', {
      part: 'snippet',
      channelId,
      order: 'date',
      maxResults,
      type: 'video',
    })
    return (data.items ?? []).map(item => ({
      videoId: item.id.videoId,
      channelId: item.snippet.channelId,
      channelName: item.snippet.channelTitle,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails?.medium?.url
        ?? item.snippet.thumbnails?.default?.url
        ?? null,
    }))
  } catch (err) {
    console.warn(`[rivals/activity] Failed for ${channelId}:`, err.message)
    return []
  }
}

rivalsRouter.get('/activity', async (req, res) => {
  const { channelIds } = req.query
  if (!channelIds?.trim()) return res.status(400).json({ error: 'channelIds is required' })

  const ids = channelIds.split(',').map(s => s.trim()).filter(Boolean).slice(0, 20)
  if (!ids.length) return res.json({ videos: [] })

  try {
    const batches = await Promise.all(ids.map(id => getRecentVideos(id, 3)))
    const videos = batches
      .flat()
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))

    res.json({ videos })
  } catch (err) {
    console.error('[rivals/activity] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

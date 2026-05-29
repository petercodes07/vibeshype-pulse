/**
 * POST /api/pulse/onboard   { channelUrl }
 *   → { profile, suggestedPeers }
 *
 * Discovers real competitor channels via YouTube search based on
 * the user's channel niche — no pre-populated DB required.
 */

import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import {
  parseInput,
  resolveChannelId,
  fetchChannelMeta,
  fetchLatestVideoIds,
  fetchVideoDetails,
} from '../services/youtube.js'

export const pulseRouter = Router()

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
    const body = await res.text()
    throw new Error(`YouTube ${path} ${res.status}: ${body}`)
  }
  return res.json()
}

let _anthropic
function anthropic() {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set')
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _anthropic
}

function parseDurationSeconds(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return 0
  return (parseInt(m[1] ?? 0) * 3600) + (parseInt(m[2] ?? 0) * 60) + parseInt(m[3] ?? 0)
}

function formatSubs(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

async function analyseChannel(meta, videos) {
  const titles = videos.slice(0, 15).map(v => v.title).join('\n')

  const msg = await anthropic().messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `You are analysing a YouTube channel to find its exact niche and direct competitors.

Channel name: ${meta.name}
Channel description: ${meta.description?.slice(0, 500) ?? ''}
Recent video titles:
${titles}

Return a JSON object with these exact keys:
- format: short label for content format (e.g. "Lyrics videos", "Gaming commentary", "Cooking tutorials")
- genres: array of 2-4 specific niche tags — be precise, not generic (e.g. ["Lyrics", "Music"] not just ["Music"])
- languages: array of languages used (e.g. ["English"])
- searchQueries: array of 4 YouTube search queries that would find channels posting the SAME TYPE of content. Be very specific to the niche — if the channel posts lyrics videos, search for "lyrics video channel", not just "music channel". Each query should target a slightly different angle of the same niche.

Examples for a lyrics channel: ["lyrics video channel", "official lyrics music youtube", "song lyrics videos channel", "lyrics music videos"]
Examples for a cooking channel: ["home cooking recipes channel", "easy recipes youtube channel", "cooking tutorial channel", "homemade food recipes"]

Reply ONLY with valid JSON, no markdown.`,
    }],
  })

  try {
    return JSON.parse(msg.content[0].text.trim())
  } catch {
    const fallback = meta.name
    return {
      format: 'Mixed',
      genres: ['General'],
      languages: ['English'],
      searchQueries: [`${fallback} channel`, `${fallback} youtube`],
    }
  }
}

async function findCompetitorChannels(searchQueries, excludeChannelId) {
  const seen = new Set([excludeChannelId])
  const channelIds = []

  for (const q of searchQueries) {
    try {
      const data = await ytGet('search', {
        part: 'snippet',
        type: 'channel',
        q,
        maxResults: 8,
        relevanceLanguage: 'en',
      })
      for (const item of data.items ?? []) {
        const id = item.snippet?.channelId
        if (id && !seen.has(id)) {
          seen.add(id)
          channelIds.push(id)
        }
      }
    } catch (err) {
      console.warn(`[pulse/onboard] Search query failed: "${q}" —`, err.message)
    }
    if (channelIds.length >= 15) break
  }

  if (!channelIds.length) return []

  // Fetch full channel metadata for all found channels
  const data = await ytGet('channels', {
    part: 'snippet,statistics',
    id: channelIds.slice(0, 15).join(','),
  })

  return (data.items ?? []).map(ch => ({
    channelId: ch.id,
    name: ch.snippet.title,
    subs: formatSubs(parseInt(ch.statistics.subscriberCount ?? '0', 10)),
    avatar: ch.snippet.thumbnails?.high?.url ?? ch.snippet.thumbnails?.default?.url ?? null,
  }))
}

pulseRouter.post('/onboard', async (req, res) => {
  const { channelUrl } = req.body ?? {}
  if (!channelUrl?.trim()) return res.status(400).json({ error: 'channelUrl is required' })

  try {
    console.log(`[pulse/onboard] Input: ${channelUrl}`)

    const parsed = parseInput(channelUrl)
    const channelId = await resolveChannelId(parsed)
    console.log(`[pulse/onboard] Resolved: ${channelId}`)

    const meta = await fetchChannelMeta(channelId)
    const videoIds = await fetchLatestVideoIds(channelId, 15)
    const videoDetails = await fetchVideoDetails(videoIds)

    const durations = videoDetails.map(v => parseDurationSeconds(v.duration)).filter(d => d > 0)
    const avgDuration = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0

    // AI analysis + competitor search in parallel
    const aiResult = await analyseChannel(meta, videoDetails)

    console.log(`[pulse/onboard] Search queries: ${aiResult.searchQueries?.join(' | ')}`)
    const suggestedPeers = await findCompetitorChannels(aiResult.searchQueries ?? [], channelId)

    const profile = {
      channelId,
      channelName: meta.name,
      thumbnail_url: meta.thumbnail_url ?? null,
      format: aiResult.format,
      genres: aiResult.genres,
      languages: aiResult.languages,
      avgDuration,
    }

    console.log(`[pulse/onboard] Done — ${suggestedPeers.length} competitors found`)
    res.json({ profile, suggestedPeers })

  } catch (err) {
    console.error('[pulse/onboard] Error:', err.message)
    res.status(502).json({ error: err.message })
  }
})

// ── In-memory store (per server session) ─────────────────────────────────────
const store = {
  peers:   [],   // array of channelIds saved during onboarding
  actions: {},   // recId → action ('posted' | 'skipped' | 'dismissed')
}

// GET /api/pulse/profile
// Returns a minimal profile shell; channel data lives in localStorage on client
pulseRouter.get('/profile', (_req, res) => {
  res.json({ channelId: null, channelName: null })
})

// GET /api/pulse/peers
pulseRouter.get('/peers', (_req, res) => {
  res.json({ peers: store.peers })
})

// PUT /api/pulse/peers  { channelIds: [...] }
pulseRouter.put('/peers', (req, res) => {
  const { channelIds } = req.body ?? {}
  if (Array.isArray(channelIds)) {
    store.peers = channelIds.filter(id => typeof id === 'string' && id.trim())
    console.log(`[pulse/peers] Saved ${store.peers.length} peer IDs`)
  }
  res.json({ ok: true })
})

// GET /api/pulse/today
// Fetches recent videos from saved peer channels and surfaces potential picks.
// Falls back to empty array if no peers saved yet.
pulseRouter.get('/today', async (_req, res) => {
  if (!store.peers.length) {
    console.log('[pulse/today] No peers saved — returning empty picks')
    return res.json({ picks: [] })
  }

  try {
    // Fetch up to 5 recent videos per peer channel
    const batches = await Promise.all(
      store.peers.slice(0, 10).map(id => getRecentVideosForPicks(id, 5))
    )
    const allVideos = batches.flat()

    // Group by normalised title to find cross-peer signals
    const titleMap = new Map()
    for (const v of allVideos) {
      const key = normaliseTitle(v.title)
      if (!titleMap.has(key)) titleMap.set(key, [])
      titleMap.get(key).push(v)
    }

    // Dedupe titles, cap to top 12 by peer count to bound YouTube quota
    const candidates = [...titleMap.entries()]
      .map(([key, videos]) => ({ key, videos: videos.sort((a, b) => b.viewCount - a.viewCount) }))
      .sort((a, b) => b.videos.length - a.videos.length)
      .slice(0, 20)

    // For each candidate, search YouTube for the same song uploaded in the last 7 days
    // by anyone, and aggregate cross-channel usage + emerging views.
    const enriched = await Promise.all(candidates.map(async ({ videos }) => {
      const top = videos[0]
      const query = normaliseTitle(top.title)
      const usage = await searchSongUsageLast7Days(query, new Set(videos.map(v => v.videoId)))
      return { videos, top, usage }
    }))

    const picks = enriched.map(({ videos, top, usage }) => {
      const crossCount = usage.channelCount
      const crossViews = usage.totalViews
      const peerCount = videos.length
      const reason = crossCount > 0
        ? `${peerCount} peer${peerCount > 1 ? 's' : ''} posted this — ${crossCount} other channel${crossCount > 1 ? 's' : ''} uploaded the same song in the last 7 days (${formatViews(crossViews)} combined views).`
        : `${peerCount} peer${peerCount > 1 ? 's' : ''} posted this recently.`

      // Merge peer sources + outside sources (top by views)
      const peerSources = videos.map(v => ({ name: v.channelName, views: v.viewCount, avatar: null }))
      const outsideSources = usage.top.map(v => ({ name: v.channelName, views: v.viewCount, avatar: null }))
      const sources = [...peerSources, ...outsideSources]
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)

      return {
        id:              top.videoId,
        title:           top.title,
        artist:          top.channelName,
        cover:           top.thumbnail ?? null,
        reason,
        peerCount,
        crossChannelCount: crossCount,
        crossChannelViews: crossViews,
        viewsPerHour:    usage.viewsPerHour,
        chartRank:       null,
        lyricsAvailable: false,
        variant:         'original',
        sources,
      }
    })

    // Rank: usage count first, then emerging views
    picks.sort((a, b) =>
      (b.crossChannelCount + b.peerCount) - (a.crossChannelCount + a.peerCount)
      || b.crossChannelViews - a.crossChannelViews
    )

    console.log(`[pulse/today] Returning ${picks.length} picks from ${store.peers.length} peers`)
    res.json({ picks: picks.slice(0, 25) })
  } catch (err) {
    console.error('[pulse/today] Error:', err.message)
    res.json({ picks: [] })
  }
})

// GET /api/pulse/history
pulseRouter.get('/history', (_req, res) => {
  res.json({ history: [] })
})

// POST /api/pulse/recommendations/:id/action  { action }
pulseRouter.post('/recommendations/:id/action', (req, res) => {
  const { action } = req.body ?? {}
  if (action) store.actions[req.params.id] = action
  res.json({ ok: true })
})

// ── Helpers for /today ────────────────────────────────────────────────────────

async function getRecentVideosForPicks(channelId, maxResults = 5) {
  try {
    const data = await ytGet('search', {
      part: 'snippet',
      channelId,
      type: 'video',
      order: 'date',
      maxResults,
      videoCategoryId: '10', // Music category hint
    })
    const videoIds = (data.items ?? []).map(i => i.id?.videoId).filter(Boolean)
    if (!videoIds.length) return []

    const details = await ytGet('videos', {
      part: 'snippet,statistics',
      id: videoIds.join(','),
    })

    return (details.items ?? []).map(v => ({
      videoId:     v.id,
      title:       v.snippet.title,
      channelName: v.snippet.channelTitle,
      thumbnail:   v.snippet.thumbnails?.medium?.url ?? null,
      publishedAt: v.snippet.publishedAt,
      viewCount:   parseInt(v.statistics?.viewCount ?? '0', 10),
    }))
  } catch (err) {
    console.warn(`[pulse/today] Failed to fetch videos for ${channelId}:`, err.message)
    return []
  }
}

// Search YouTube for other uploads of the same song in the last 7 days.
// Returns channel count (distinct), total views, top uploads, and avg views/hour.
async function searchSongUsageLast7Days(query, excludeVideoIds) {
  if (!query) return { channelCount: 0, totalViews: 0, viewsPerHour: null, top: [] }
  const publishedAfter = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  try {
    const search = await ytGet('search', {
      part: 'snippet',
      type: 'video',
      q: query,
      order: 'viewCount',
      maxResults: 20,
      publishedAfter,
      videoCategoryId: '10',
    })
    const ids = (search.items ?? [])
      .map(i => i.id?.videoId)
      .filter(id => id && !excludeVideoIds.has(id))
    if (!ids.length) return { channelCount: 0, totalViews: 0, viewsPerHour: null, top: [] }

    const details = await ytGet('videos', {
      part: 'snippet,statistics',
      id: ids.slice(0, 20).join(','),
    })

    const videos = (details.items ?? []).map(v => ({
      videoId:     v.id,
      title:       v.snippet.title,
      channelId:   v.snippet.channelId,
      channelName: v.snippet.channelTitle,
      publishedAt: v.snippet.publishedAt,
      viewCount:   parseInt(v.statistics?.viewCount ?? '0', 10),
    }))

    const distinctChannels = new Set(videos.map(v => v.channelId))
    const totalViews = videos.reduce((a, v) => a + v.viewCount, 0)
    const now = Date.now()
    const viewsPerHour = videos.length
      ? Math.round(videos.reduce((a, v) => {
          const hours = Math.max(1, (now - new Date(v.publishedAt).getTime()) / 3_600_000)
          return a + v.viewCount / hours
        }, 0))
      : null
    const top = videos.sort((a, b) => b.viewCount - a.viewCount).slice(0, 3)

    return { channelCount: distinctChannels.size, totalViews, viewsPerHour, top }
  } catch (err) {
    console.warn(`[pulse/today] Song-usage search failed for "${query}":`, err.message)
    return { channelCount: 0, totalViews: 0, viewsPerHour: null, top: [] }
  }
}

function formatViews(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function normaliseTitle(title = '') {
  return title
    .toLowerCase()
    .replace(/\(.*?\)/g, '')      // remove parentheses
    .replace(/\[.*?\]/g, '')      // remove brackets
    .replace(/[^a-z0-9\s]/g, '')  // strip punctuation
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)                  // cap length for comparison
}


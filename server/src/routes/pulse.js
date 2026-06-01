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

/**
 * GET /api/pulse/discover?channelId=UCxxx
 *
 * Niche-aware channel discovery (#14).
 * Re-uses the onboard AI analysis to derive search queries from the
 * user's actual content, then searches YouTube for channels posting
 * the same type of content. Returns up to 15 ranked suggestions,
 * excluding channels already saved as peers.
 *
 * Response: { suggestions: [{ channelId, name, subs, avatar, relevance }] }
 */
pulseRouter.get('/discover', async (req, res) => {
  const { channelId } = req.query
  if (!channelId) return res.status(400).json({ error: 'channelId is required' })

  try {
    // 1. Fetch channel metadata + recent videos
    const meta     = await fetchChannelMeta(channelId)
    const videoIds = await fetchLatestVideoIds(channelId, 10)
    const videos   = await fetchVideoDetails(videoIds)

    // 2. AI niche analysis (reuses existing analyseChannel function)
    const analysis = await analyseChannel(meta, videos)
    console.log(`[pulse/discover] Niche: ${analysis.format} / queries: ${analysis.searchQueries?.join(' | ')}`)

    // 3. Find competitor channels via the same search logic as onboard
    const all = await findCompetitorChannels(analysis.searchQueries ?? [], channelId)

    // 4. Exclude channels already saved as peers
    const peerSet   = new Set(store.peers)
    const suggested = all
      .filter(ch => !peerSet.has(ch.channelId))
      .slice(0, 15)
      .map((ch, i) => ({
        ...ch,
        // Rank as relevance score 1.0 → 0.0 descending
        relevance: parseFloat((1 - i / Math.max(suggested?.length ?? 15, 15)).toFixed(2)),
        niche:     analysis.format,
        genres:    analysis.genres ?? [],
      }))

    // fix self-referential relevance calc — recompute after filter
    const withRelevance = all
      .filter(ch => !peerSet.has(ch.channelId))
      .slice(0, 15)
      .map((ch, i, arr) => ({
        ...ch,
        relevance: parseFloat((1 - i / Math.max(arr.length, 1)).toFixed(2)),
        niche:     analysis.format,
        genres:    analysis.genres ?? [],
      }))

    console.log(`[pulse/discover] ${withRelevance.length} suggestions for ${channelId}`)
    res.json({ suggestions: withRelevance, niche: analysis.format, genres: analysis.genres })
  } catch (err) {
    console.error('[pulse/discover] Error:', err.message)
    res.status(502).json({ error: err.message })
  }
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

// GET /api/pulse/opportunities
// Finds songs trending in other-language communities that haven't been
// picked up by the user's peer niche yet (gap = opportunity).
pulseRouter.get('/opportunities', async (_req, res) => {
  if (!store.peers.length) return res.json({ opportunities: [] })

  const LANG_TARGETS = [
    { code: 'ar', label: 'Arabic'     },
    { code: 'es', label: 'Spanish'    },
    { code: 'pt', label: 'Portuguese' },
    { code: 'fr', label: 'French'     },
  ]

  try {
    // 1. Collect song titles from peer channels (last 5 videos each, up to 8 peers)
    const batches = await Promise.all(
      store.peers.slice(0, 8).map(id => getRecentVideosForPicks(id, 5))
    )
    const peerVideos = batches.flat()
    if (!peerVideos.length) return res.json({ opportunities: [] })

    // Dedupe by normalised title → track inside-niche usage
    const titleMap = new Map()
    for (const v of peerVideos) {
      const key = normaliseTitle(v.title)
      if (!titleMap.has(key)) titleMap.set(key, { videos: [], raw: v.title })
      titleMap.get(key).videos.push(v)
    }

    // 2. For each title, search each target language and score the gap
    const publishedAfter = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()

    const scored = await Promise.all([...titleMap.entries()].slice(0, 15).map(async ([key, { videos, raw }]) => {
      const peerCount  = videos.length
      const insideViews = videos.reduce((a, v) => a + v.viewCount, 0)
      const top = videos.sort((a, b) => b.viewCount - a.viewCount)[0]

      let outsideViews = 0
      const langHits = []

      for (const lang of LANG_TARGETS) {
        try {
          const search = await ytGet('search', {
            part: 'snippet',
            type: 'video',
            q: key,
            order: 'viewCount',
            maxResults: 10,
            publishedAfter,
            relevanceLanguage: lang.code,
            videoCategoryId: '10',
          })
          const ids = (search.items ?? [])
            .map(i => i.id?.videoId)
            .filter(id => id && !videos.find(v => v.videoId === id))
          if (!ids.length) continue

          const details = await ytGet('videos', {
            part: 'snippet,statistics',
            id: ids.slice(0, 10).join(','),
          })
          const langViews = (details.items ?? []).reduce(
            (a, v) => a + parseInt(v.statistics?.viewCount ?? '0', 10), 0
          )
          if (langViews > 0) {
            outsideViews += langViews
            langHits.push({ label: lang.label, views: langViews })
          }
        } catch (err) {
          console.warn(`[pulse/opportunities] lang search failed (${lang.code}):`, err.message)
        }
      }

      // Gap score: outside viral × inverse inside saturation
      const saturation = Math.min(peerCount / 3, 1)          // 0–1 (3+ peers = fully saturated)
      const gapScore   = outsideViews * (1 - saturation * 0.8)

      return { key, raw, top, peerCount, insideViews, outsideViews, langHits, gapScore }
    }))

    // 3. Filter: must have meaningful outside signal + low inside saturation
    const opportunities = scored
      .filter(s => s.outsideViews >= 30_000 && s.peerCount <= 2)
      .sort((a, b) => b.gapScore - a.gapScore)
      .slice(0, 5)
      .map(s => {
        const topLangs = s.langHits
          .sort((a, b) => b.views - a.views)
          .slice(0, 2)
          .map(l => l.label)

        const langStr = topLangs.length
          ? `Trending in ${topLangs.join(' & ')} (${formatViews(s.outsideViews)} views)`
          : `${formatViews(s.outsideViews)} views outside your niche`

        const peerStr = s.peerCount === 0
          ? '— not posted by any peer yet.'
          : `— only ${s.peerCount} peer${s.peerCount > 1 ? 's' : ''} in your niche have posted it.`

        return {
          id:                 s.top.videoId,
          title:              s.top.title,
          artist:             s.top.channelName,
          cover:              s.top.thumbnail ?? null,
          reason:             `${langStr} ${peerStr}`,
          opportunityLanguages: topLangs,
          outsideViews:       s.outsideViews,
          insideViews:        s.insideViews,
          gapScore:           Math.round(s.gapScore),
          peerCount:          s.peerCount,
          sources:            s.langHits
            .sort((a, b) => b.views - a.views)
            .map(l => ({ name: `${l.label} community`, views: l.views, avatar: null })),
        }
      })

    console.log(`[pulse/opportunities] ${opportunities.length} gaps found from ${store.peers.length} peers`)
    res.json({ opportunities })
  } catch (err) {
    console.error('[pulse/opportunities] Error:', err.message)
    res.json({ opportunities: [] })
  }
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


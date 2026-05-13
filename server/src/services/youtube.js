/**
 * YouTube Data API v3 service
 *
 * Handles:
 *  - Parsing channel URL / @handle / video URL into a channel ID
 *  - Fetching channel metadata
 *  - Fetching latest videos (up to 20)
 *  - Fetching per-video statistics + description
 */

const YT = 'https://www.googleapis.com/youtube/v3'

function key() {
  if (!process.env.YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY not set')
  return process.env.YOUTUBE_API_KEY
}

async function ytGet(path, params) {
  const url = new URL(`${YT}/${path}`)
  url.searchParams.set('key', key())
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`YouTube API ${path} ${res.status}: ${body}`)
  }
  return res.json()
}

// ── Input parsing ────────────────────────────────────────────────────────────

/**
 * Returns { type: 'channelId'|'handle'|'videoId', value: string }
 * Accepts:
 *   https://youtube.com/channel/UCxxxxxxx
 *   https://youtube.com/@handle
 *   https://youtube.com/c/name
 *   https://youtu.be/videoId  or  https://youtube.com/watch?v=videoId
 *   @handle  (bare)
 *   UCxxxxxxx  (bare channel ID)
 */
export function parseInput(raw) {
  const s = raw.trim()
  try {
    const url = new URL(s)
    const host = url.hostname.replace('www.', '')

    if (host === 'youtu.be') {
      return { type: 'videoId', value: url.pathname.slice(1) }
    }
    if (host === 'youtube.com') {
      const v = url.searchParams.get('v')
      if (v) return { type: 'videoId', value: v }
      const parts = url.pathname.split('/').filter(Boolean) // ['channel','UCxxx'] or ['@handle']
      if (parts[0] === 'channel') return { type: 'channelId', value: parts[1] }
      if (parts[0]?.startsWith('@')) return { type: 'handle', value: parts[0] }
      if (parts[0] === 'c' || parts[0] === 'user') return { type: 'handle', value: parts[1] }
    }
  } catch {
    // not a URL
  }
  if (s.startsWith('UC') && s.length === 24) return { type: 'channelId', value: s }
  if (s.startsWith('@')) return { type: 'handle', value: s.slice(1) }
  return { type: 'handle', value: s }
}

// ── Channel ID resolution ────────────────────────────────────────────────────

export async function resolveChannelId(parsed) {
  const { type, value } = parsed

  if (type === 'channelId') return value

  if (type === 'handle') {
    // Channels search by handle via the forHandle param
    const data = await ytGet('channels', { part: 'id', forHandle: value })
    const id = data.items?.[0]?.id
    if (!id) throw new Error(`No channel found for handle @${value}`)
    return id
  }

  if (type === 'videoId') {
    const data = await ytGet('videos', { part: 'snippet', id: value })
    const channelId = data.items?.[0]?.snippet?.channelId
    if (!channelId) throw new Error(`No channel found for video ${value}`)
    return channelId
  }

  throw new Error('Unknown input type')
}

// ── Channel metadata ─────────────────────────────────────────────────────────

export async function fetchChannelMeta(channelId) {
  const data = await ytGet('channels', {
    part: 'snippet,statistics,brandingSettings',
    id: channelId,
  })
  const ch = data.items?.[0]
  if (!ch) throw new Error(`Channel ${channelId} not found`)

  return {
    id: ch.id,
    name: ch.snippet.title,
    description: ch.snippet.description ?? '',
    handle: ch.snippet.customUrl ?? null,
    thumbnail_url: ch.snippet.thumbnails?.high?.url ?? ch.snippet.thumbnails?.default?.url ?? null,
    subscriber_count: parseInt(ch.statistics.subscriberCount ?? '0', 10),
    video_count: parseInt(ch.statistics.videoCount ?? '0', 10),
    country: ch.snippet.country ?? null,
  }
}

// ── Latest videos ────────────────────────────────────────────────────────────

/**
 * Returns an array of up to `maxResults` video IDs from the channel's uploads.
 */
export async function fetchLatestVideoIds(channelId, maxResults = 20) {
  // 1. Get uploads playlist ID
  const ch = await ytGet('channels', { part: 'contentDetails', id: channelId })
  const uploadsId = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsId) throw new Error(`No uploads playlist for ${channelId}`)

  // 2. List playlist items
  const pl = await ytGet('playlistItems', {
    part: 'contentDetails',
    playlistId: uploadsId,
    maxResults,
  })
  return (pl.items ?? []).map(i => i.contentDetails.videoId)
}

/**
 * Fetches full snippet + statistics for a batch of video IDs (max 50 per call).
 */
export async function fetchVideoDetails(videoIds) {
  if (!videoIds.length) return []
  const data = await ytGet('videos', {
    part: 'snippet,statistics,contentDetails',
    id: videoIds.join(','),
  })
  return (data.items ?? []).map(v => ({
    id: v.id,
    title: v.snippet.title,
    description: v.snippet.description ?? '',
    view_count: parseInt(v.statistics.viewCount ?? '0', 10),
    like_count: parseInt(v.statistics.likeCount ?? '0', 10),
    comment_count: parseInt(v.statistics.commentCount ?? '0', 10),
    duration: v.contentDetails.duration,
    published_at: v.snippet.publishedAt,
  }))
}

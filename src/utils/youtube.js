/**
 * Shared YouTube RSS helpers used by Home and Rivals pages.
 * resolveToUCId  — converts custom_https://... channel IDs to real UC... IDs
 * fetchYouTubeRSS — fetches recent videos from YouTube's public Atom feeds
 */

export async function resolveToUCId(ch) {
  if (ch.channelId?.startsWith('UC')) return ch.channelId
  if (!ch.channelId?.startsWith('custom_')) return null

  const url = ch.channelId.slice('custom_'.length)
  const cacheKey = `yt_cid:${url}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) return cached

  const patterns = [
    /feeds\/videos\.xml\?channel_id=(UC[\w-]{22})/,
    /"channelId":"(UC[\w-]{22})"/,
    /"externalId":"(UC[\w-]{22})"/,
    /\/channel\/(UC[\w-]{22})/,
  ]

  // Try fetching YouTube page variants
  for (const pageUrl of [url, url + '/videos', url + '/about']) {
    try {
      const res = await fetch(pageUrl, { signal: AbortSignal.timeout(10000) })
      if (!res.ok) continue
      const html = await res.text()
      for (const pat of patterns) {
        const m = html.match(pat)
        if (m) { localStorage.setItem(cacheKey, m[1]); return m[1] }
      }
    } catch { /* try next */ }
  }

  // Fallback: Piped open-source YouTube API
  try {
    const handle = url.split('@').pop()?.split(/[/?#]/)[0]
    if (handle) {
      const res = await fetch(`https://pipedapi.kavin.rocks/channel/@${handle}`, {
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const data = await res.json()
        const id = (data?.id ?? '').replace(/^\/channel\//, '')
        if (id.startsWith('UC')) { localStorage.setItem(cacheKey, id); return id }
      }
    }
  } catch { /* give up */ }

  return null
}

export async function fetchYouTubeRSS(trackedChannels) {
  const resolved = await Promise.all(
    trackedChannels.map(async ch => ({ ...ch, resolvedId: await resolveToUCId(ch) }))
  )
  const valid = resolved.filter(ch => ch.resolvedId)
  if (!valid.length) return []

  const results = await Promise.allSettled(
    valid.map(async ch => {
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ch.resolvedId}`
      const res = await fetch(feedUrl, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) return []
      const text = await res.text()
      const doc = new DOMParser().parseFromString(text, 'application/xml')
      return [...doc.querySelectorAll('entry')].slice(0, 8).map(e => {
        const link = e.querySelector('link')?.getAttribute('href') ?? ''
        const videoId = link.match(/[?&]v=([^&]+)/)?.[1]
          ?? e.querySelector('id')?.textContent?.split(':').pop() ?? ''

        // YouTube RSS includes <media:statistics views="N"/> under the media namespace
        const MEDIA_NS = 'http://search.yahoo.com/mrss/'
        const statsEl  = e.getElementsByTagNameNS(MEDIA_NS, 'statistics')[0]
        const views    = statsEl ? (parseInt(statsEl.getAttribute('views') || '0', 10) || null) : null

        return {
          videoId,
          title:       e.querySelector('title')?.textContent ?? '',
          publishedAt: e.querySelector('published')?.textContent ?? '',
          thumbnail:   videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null,
          channelName: ch.name,
          channelId:   ch.resolvedId,
          views,       // number | null
        }
      }).filter(v => v.videoId)
    })
  )

  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
}

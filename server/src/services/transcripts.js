/**
 * Transcript fetcher
 *
 * Uses the youtube-transcript package to pull auto-generated or manual captions.
 * Silently returns '' for videos without captions (no subtitles, private, etc.)
 */

import { YoutubeTranscript } from 'youtube-transcript'

/**
 * Fetch the plain-text transcript for a single video ID.
 * Returns '' if unavailable.
 */
export async function fetchTranscript(videoId) {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId)
    return segments.map(s => s.text).join(' ').replace(/\s+/g, ' ').trim()
  } catch {
    return ''
  }
}

/**
 * Fetch transcripts for multiple video IDs concurrently (with concurrency cap).
 * Returns a Map<videoId, transcriptText>.
 */
export async function fetchTranscripts(videoIds, concurrency = 5) {
  const results = new Map()
  const queue = [...videoIds]

  async function worker() {
    while (queue.length) {
      const id = queue.shift()
      results.set(id, await fetchTranscript(id))
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker))
  return results
}

/**
 * Smart competitor alerts hook.
 *
 * Polls RSS feeds every 20 min and fires OS notifications + in-app toasts for:
 *   1. Same-song clusters  — N+ tracked competitors post about the same song within 24h
 *   2. View velocity spikes — a competitor video hits 100K+ views within 6h of first seen
 *
 * Reads settings from localStorage:
 *   pulse_alerts_enabled            'true' | 'false'  (default true)
 *   pulse_alerts_cluster_threshold  number             (default 3)
 *   pulse_alerts_velocity_threshold number             (default 100000)
 *
 * Deduplication keys stored in pulse_alerts_fired  { key: timestamp }
 * First-seen video timestamps stored in pulse_first_seen  { videoId: ISO }
 */

import { useEffect, useCallback, useRef } from 'react'
import { fetchYouTubeRSS }                from '../utils/youtube'
import { useToast }                        from '../context/ToastContext'

// ── Constants ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL        = 20 * 60_000        // 20 minutes between polls
const DEFAULT_VELOCITY     = 100_000            // views threshold for velocity alert
const VELOCITY_WINDOW_H    = 6                  // hours within first-seen for velocity
const FRESH_WINDOW_MS      = 24 * 60 * 60_000   // same-song cluster window: 24h
const JACCARD_THRESH       = 0.45               // word-overlap required to be "same song"

// ── Text helpers ──────────────────────────────────────────────────────────────

function tokenize(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2)
}

function jaccard(toksA, toksB) {
  const setA = new Set(toksA)
  const setB = new Set(toksB)
  const inter = [...setA].filter(x => setB.has(x)).length
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : inter / union
}

/**
 * Extract the most-likely song portion from a video title.
 * "Ed Sheeran - Shape of You (Official Video)"  →  "Shape of You"
 * "I tried APT. by ROSÉ | dance cover reaction" →  "APT."
 */
function extractSongName(title) {
  // After a dash / pipe separator, the song name usually follows
  const after = title.match(/[-|–—]\s*(.+)/)
  const raw   = after ? after[1] : title
  return raw
    .replace(/\(official.*?\)/gi, '')
    .replace(/\[.*?\]/gi,          '')
    .replace(/official\s+(video|audio|lyric|music video)/gi, '')
    .replace(/\|.*$/,              '')
    .trim()
}

function couldBeSameSong(titleA, titleB) {
  const a = tokenize(extractSongName(titleA))
  const b = tokenize(extractSongName(titleB))
  if (!a.length || !b.length) return false
  return jaccard(a, b) >= JACCARD_THRESH
}

// ── Alert deduplication ───────────────────────────────────────────────────────

function getFired() {
  try { return JSON.parse(localStorage.getItem('pulse_alerts_fired') || '{}') } catch { return {} }
}
function markFired(key) {
  const fired = getFired()
  fired[key]  = Date.now()
  localStorage.setItem('pulse_alerts_fired', JSON.stringify(fired))
}
function alreadyFired(key) { return !!getFired()[key] }

// ── OS notification ───────────────────────────────────────────────────────────

function fireOSNotification(title, body) {
  if (!('Notification' in window)) return
  const send = () => {
    try { new Notification(title, { body, silent: false }) } catch {}
  }
  if (Notification.permission === 'granted') {
    send()
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => { if (p === 'granted') send() })
  }
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmtViews(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K`
  return String(n)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export default function useCompetitorAlerts() {
  const showToast = useToast()
  const timerRef  = useRef(null)

  const runCheck = useCallback(async () => {
    // Kill switch
    if (localStorage.getItem('pulse_alerts_enabled') === 'false') return

    // Tracked channels
    let tracked = []
    try { tracked = JSON.parse(localStorage.getItem('pulse_tracked_rivals') || '[]') } catch {}
    if (!tracked.length) return

    // Settings
    const threshold        = parseInt(localStorage.getItem('pulse_alerts_cluster_threshold')  || '3',                       10)
    const velocityThresh   = parseInt(localStorage.getItem('pulse_alerts_velocity_threshold') || String(DEFAULT_VELOCITY),   10)

    // Stamp last poll time before fetch (so a crash doesn't cause hammer-retry)
    localStorage.setItem('pulse_alerts_last_poll', String(Date.now()))

    // Fetch RSS feeds
    let videos = []
    try { videos = await fetchYouTubeRSS(tracked) } catch { return }
    if (!videos.length) return

    const now = Date.now()

    // ── Update first-seen map ─────────────────────────────────────────────────
    let firstSeen = {}
    try { firstSeen = JSON.parse(localStorage.getItem('pulse_first_seen') || '{}') } catch {}
    videos.forEach(v => {
      if (!firstSeen[v.videoId]) {
        firstSeen[v.videoId] = v.publishedAt || new Date().toISOString()
      }
    })
    localStorage.setItem('pulse_first_seen', JSON.stringify(firstSeen))

    // ── 1. Same-song cluster detection ────────────────────────────────────────
    // Only look at videos posted within the last 24 hours
    const fresh = videos.filter(v => now - new Date(v.publishedAt).getTime() <= FRESH_WINDOW_MS)

    // Group into clusters by title similarity
    const clusters = [] // Array<video[]>
    for (const video of fresh) {
      let placed = false
      for (const cluster of clusters) {
        if (couldBeSameSong(video.title, cluster[0].title)) {
          cluster.push(video)
          placed = true
          break
        }
      }
      if (!placed) clusters.push([video])
    }

    for (const cluster of clusters) {
      if (cluster.length < threshold) continue

      const songName = extractSongName(cluster[0].title)
      const slug     = songName.slice(0, 40).toLowerCase().replace(/\s+/g, '_').replace(/\W/g, '')
      const dayKey   = `cluster:${slug}:${new Date().toISOString().slice(0, 10)}`

      if (alreadyFired(dayKey)) continue
      markFired(dayKey)

      const names  = [...new Set(cluster.map(v => v.channelName))].slice(0, 4).join(', ')
      const osBody = `${cluster.length} competitors posted about "${songName}" today — ${names}`
      const toast  = `🔥 ${cluster.length} rivals posted about "${songName.slice(0, 32)}"`

      fireOSNotification('🔥 Trending song alert', osBody)
      showToast(toast, 'info')
    }

    // ── 2. View velocity detection ────────────────────────────────────────────
    for (const video of videos) {
      if (!video.views || video.views < velocityThresh) continue

      const seenAt = firstSeen[video.videoId]
      if (!seenAt) continue

      const ageH = (now - new Date(seenAt).getTime()) / 3_600_000
      if (ageH > VELOCITY_WINDOW_H) continue  // Not a fresh spike

      const alertKey = `velocity:${video.videoId}`
      if (alreadyFired(alertKey)) continue
      markFired(alertKey)

      const viewsStr = fmtViews(video.views)
      const osBody   = `"${video.title}" by ${video.channelName} — ${viewsStr} views in ${ageH.toFixed(1)}h`
      const toast    = `⚡ "${video.title.slice(0, 34)}" hit ${viewsStr} views fast`

      fireOSNotification('⚡ View velocity spike', osBody)
      showToast(toast, 'info')
    }
  }, [showToast])

  useEffect(() => {
    // Fire immediately if last poll was over POLL_INTERVAL ago (or never)
    const lastPoll = parseInt(localStorage.getItem('pulse_alerts_last_poll') || '0', 10)
    if (Date.now() - lastPoll >= POLL_INTERVAL) {
      // Small delay so React tree stabilises before network calls
      const t = setTimeout(runCheck, 3000)
      timerRef.current = t
    }

    // Schedule recurring polls
    const interval = setInterval(runCheck, POLL_INTERVAL)
    return () => {
      clearTimeout(timerRef.current)
      clearInterval(interval)
    }
  }, [runCheck])
}

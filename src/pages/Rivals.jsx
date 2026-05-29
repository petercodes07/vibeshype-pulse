/**
 * Rivals — Competitor tracking hub
 *
 * Three tabs:
 *   Tracking  — channels the user has added as competitors
 *   Discover  — suggested peers from onboarding to add or dismiss
 *   Activity  — latest videos from tracked channels (live feed)
 *
 * All per-user state lives in localStorage (no server auth required).
 */

import { useState, useEffect } from 'react'
import { X, Play, Tv, Plus, Check } from 'lucide-react'
import { rivals, pulse, competitors as competitorsApi } from '../api'
import { fetchYouTubeRSS } from '../utils/youtube'
import { useToast } from '../context/ToastContext'

// ── localStorage helpers ──────────────────────────────────────────────────────

const KEY_TRACKED   = 'pulse_tracked_rivals'
const KEY_DISMISSED = 'pulse_dismissed_rivals'
const KEY_SUGGESTED = 'pulse_suggested_rivals'
const KEY_SEEN      = 'pulse_activity_seen'
const KEY_BADGE     = 'pulse_rivals_badge'

function loadJSON(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback }
  catch { return fallback }
}
function saveJSON(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

// fetchYouTubeRSS is imported from ../utils/youtube

// ── Main component ────────────────────────────────────────────────────────────

export default function Rivals() {
  const [tab, setTab] = useState(0) // 0=discover 1=activity

  const [tracked,   setTracked]   = useState(() => loadJSON(KEY_TRACKED))
  const [dismissed, setDismissed] = useState(() => new Set(loadJSON(KEY_DISMISSED)))
  const [suggested, setSuggested] = useState(() => loadJSON(KEY_SUGGESTED))
  const [seen,      setSeen]      = useState(() => new Set(loadJSON(KEY_SEEN)))

  // Channel ID resolution — localStorage first, then server profile fallback
  const [channelId,        setChannelId]        = useState(() => localStorage.getItem('pulse_channel_id') || null)
  const [channelIdLoading, setChannelIdLoading] = useState(false)
  const [channelIdMissing, setChannelIdMissing] = useState(false) // still unknown after profile fetch

  // Real AI competitors from the local server
  const [competitors,      setCompetitors]      = useState(null)
  const [competitorsError, setCompetitorsError] = useState(null)
  const [competitorsFetched, setCompetitorsFetched] = useState(false)

  const [activity,        setActivity]        = useState(null) // null = not yet loaded
  const [activityError,   setActivityError]   = useState(null)
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityRefresh, setActivityRefresh] = useState(0) // bump to retry

  // Last-posted timestamps per channel (for the Tracking tab)
  const [lastPosted, setLastPosted] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pulse_last_posted') || '{}') }
    catch { return {} }
  })

  // In-app modals
  const [activeVideo,   setActiveVideo]   = useState(null) // { videoId, title, channelName }
  const [activeChannel, setActiveChannel] = useState(null) // tracked channel object

  // On mount: if we don't have a channelId, ask the server for it
  useEffect(() => {
    if (channelId) return
    setChannelIdLoading(true)
    pulse.profile()
      .then(data => {
        const id = data?.channelId ?? data?.channel_id ?? null
        if (id) {
          localStorage.setItem('pulse_channel_id', id)
          setChannelId(id)
        } else {
          setChannelIdMissing(true)
        }
      })
      .catch(() => setChannelIdMissing(true))
      .finally(() => setChannelIdLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch real AI competitors when Discover tab opens and we have a channelId
  useEffect(() => {
    if (tab !== 0) return
    if (!channelId) return
    if (competitorsFetched) return // don't re-fetch on every tab visit
    setCompetitors(null)
    setCompetitorsError(null)
    competitorsApi.list(channelId)
      .then(data => { setCompetitors(data.competitors ?? []); setCompetitorsFetched(true) })
      .catch(err => { setCompetitorsError(err.message); setCompetitorsFetched(true) })
  }, [tab, channelId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch activity whenever the Activity tab is opened and tracked list is non-empty
  useEffect(() => {
    if (tab !== 2) return
    if (!tracked.length) { setActivity([]); return }

    let cancelled = false
    async function load() {
      setActivityLoading(true)
      setActivityError(null)
      try {
        const ids = tracked.map(t => t.channelId).join(',')
        const data = await rivals.activity(ids)
        if (!cancelled) setActivity(data.videos ?? [])
      } catch (err) {
        if (cancelled) return
        if (err.status === 404 || !err.status) {
          try {
            const videos = await fetchYouTubeRSS(tracked)
            if (!cancelled) setActivity(videos)
          } catch (e) {
            console.error('[activity] RSS fallback failed', e)
            if (!cancelled) setActivity([])
          }
        } else {
          setActivityError(err.message)
          setActivity([])
        }
      } finally {
        if (!cancelled) setActivityLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [tab, activityRefresh]) // re-fetches when tab changes or user hits Retry

  // Silently refresh last-posted timestamps when Tracking tab opens (5 min cache)
  useEffect(() => {
    if (tab !== 0 || !tracked.length) return
    const STALE = 5 * 60_000
    const ts = parseInt(localStorage.getItem('pulse_last_posted_ts') || '0', 10)
    if (Date.now() - ts < STALE) return
    fetchYouTubeRSS(tracked).then(videos => {
      // Build channelName → latestDate map first (RSS returns resolved IDs, not custom_ ones)
      const byName = {}
      videos.forEach(v => {
        if (!byName[v.channelName] || v.publishedAt > byName[v.channelName])
          byName[v.channelName] = v.publishedAt
      })
      // Map back to the tracked channelId (name is the reliable bridge)
      const patch = {}
      tracked.forEach(ch => { if (byName[ch.name]) patch[ch.channelId] = byName[ch.name] })
      setLastPosted(prev => {
        const next = { ...prev, ...patch }
        localStorage.setItem('pulse_last_posted', JSON.stringify(next))
        localStorage.setItem('pulse_last_posted_ts', String(Date.now()))
        return next
      })
    }).catch(() => {})
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // When Activity tab is viewed: clear badge and mark all visible as seen
  useEffect(() => {
    if (tab !== 2 || !activity) return
    saveJSON(KEY_BADGE, 0)
    const next = new Set(seen)
    activity.forEach(v => next.add(v.videoId))
    setSeen(next)
    saveJSON(KEY_SEEN, [...next])
  }, [tab, activity])

  // Unread count (videos not in seen set)
  const unread = activity ? activity.filter(v => !seen.has(v.videoId)).length : 0

  // ── Mutations ───────────────────────────────────────────────────────────────

  function addTracked(channel) {
    const entry = {
      channelId:     channel.channelId,
      name:          channel.name,
      handle:        channel.handle ?? null,
      thumbnail_url: channel.avatar ?? null,
      subs:          channel.subs   ?? '—',
      addedAt:       new Date().toISOString(),
    }
    const next = [...tracked.filter(t => t.channelId !== channel.channelId), entry]
    setTracked(next)
    saveJSON(KEY_TRACKED, next)
  }

  function removeTracked(channelId) {
    const next = tracked.filter(t => t.channelId !== channelId)
    setTracked(next)
    saveJSON(KEY_TRACKED, next)
  }

  function dismissChannel(channelId) {
    const next = new Set(dismissed)
    next.add(channelId)
    setDismissed(next)
    saveJSON(KEY_DISMISSED, [...next])
  }

  // ── Derived state ───────────────────────────────────────────────────────────

  const trackedIds = new Set(tracked.map(t => t.channelId))
  const discover   = (suggested ?? []).filter(
    s => !trackedIds.has(s.channelId) && !dismissed.has(s.channelId)
  )

  // ── Render ──────────────────────────────────────────────────────────────────
  // tab 0 = Discover, tab 1 = Activity

  const tabs = [
    { label: tracked.length ? `Tracking (${tracked.length})` : 'Tracking' },
    { label: discover.length ? `Discover (${discover.length})` : 'Discover' },
    { label: 'Activity', badge: unread },
  ]

  return (
    <div className="screen">
      {/* Header */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>
          Competitors
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
          Track competitor channels. See what they post and when.
        </div>

        {/* Tab strip */}
        <div style={{
          display: 'flex',
          background: 'var(--surface2)',
          borderRadius: 'var(--radius-sm)',
          padding: 3,
          gap: 3,
          marginBottom: 16,
        }}>
          {tabs.map(({ label, badge }, i) => (
            <button
              key={i}
              onClick={() => setTab(i)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                position: 'relative',
                background: tab === i ? 'var(--surface)' : 'transparent',
                color:      tab === i ? 'var(--light)'   : 'var(--gray)',
                transition: 'all 0.15s',
              }}
            >
              {label}
              {badge > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 8,
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--primary)',
                }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab panels */}
      {tab === 0 && (
        <TrackingTab
          tracked={tracked}
          lastPosted={lastPosted}
          onRemove={removeTracked}
          onChannelPlay={setActiveChannel}
        />
      )}
      {tab === 1 && (
        <DiscoverTab
          channels={discover}
          competitors={competitors}
          competitorsError={competitorsError}
          trackedIds={trackedIds}
          dismissed={dismissed}
          onAdd={addTracked}
          onDismiss={dismissChannel}
          onRemove={removeTracked}
          channelIdLoading={channelIdLoading}
          channelIdMissing={channelIdMissing}
          onChannelIdResolved={id => {
            localStorage.setItem('pulse_channel_id', id)
            setChannelId(id)
            setChannelIdMissing(false)
          }}
        />
      )}
      {tab === 2 && (
        <ActivityTab
          activity={activity}
          loading={activityLoading}
          error={activityError}
          hasTracked={tracked.length > 0}
          seen={seen}
          onRetry={() => { setActivity(null); setActivityRefresh(k => k + 1) }}
          onPlayVideo={setActiveVideo}
        />
      )}

      {/* In-app modals */}
      {activeChannel && (
        <ChannelModal
          channel={activeChannel}
          onClose={() => setActiveChannel(null)}
          onPlay={v => { setActiveChannel(null); setActiveVideo(v) }}
        />
      )}
      {activeVideo && (
        <VideoModal
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </div>
  )
}

// ── Tracking tab ─────────────────────────────────────────────────────────────

function TrackingTab({ tracked, lastPosted, onRemove, onChannelPlay }) {
  if (!tracked.length) {
    return (
      <EmptyState
        emoji="📡"
        title="Not tracking anyone yet"
        body="Go to Discover and add competitors — they'll appear here."
      />
    )
  }

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 4 }}>
        {tracked.length} channel{tracked.length !== 1 ? 's' : ''} tracked
      </div>
      {tracked.map(ch => {
        const lastDate = lastPosted?.[ch.channelId]
        return (
          <div key={ch.channelId} style={{
            background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
            padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <Avatar name={ch.name} src={ch.thumbnail_url} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {ch.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {ch.subs && <span>{ch.subs} subs</span>}
                {ch.handle && <span style={{ color: 'var(--border)' }}>·</span>}
                {ch.handle && <span>{ch.handle}</span>}
                {lastDate && (
                  <>
                    {(ch.subs || ch.handle) && <span style={{ color: 'var(--border)' }}>·</span>}
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      color: isRecentPost(lastDate) ? 'var(--secondary)' : 'var(--muted)',
                    }}>
                      {isRecentPost(lastDate) && (
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--secondary)', display: 'inline-block', flexShrink: 0 }} />
                      )}
                      {timeAgo(lastDate)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => onChannelPlay(ch)}
              title="View recent videos"
              style={{
                width: 30, height: 30, borderRadius: 'var(--radius-sm)',
                background: 'var(--surface2)', color: 'var(--gray)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <Play size={14} />
            </button>
            <button
              onClick={() => onRemove(ch.channelId)}
              style={{
                width: 30, height: 30, borderRadius: 'var(--radius-sm)',
                background: 'var(--surface2)', color: 'var(--gray)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

/** Returns true if the ISO date is within the last 48 hours */
function isRecentPost(iso) {
  return iso && (Date.now() - new Date(iso).getTime()) < 48 * 60 * 60_000
}

// ── Discover tab ──────────────────────────────────────────────────────────────

function DiscoverTab({
  channels, competitors, competitorsError,
  trackedIds, dismissed, onAdd, onDismiss, onRemove,
  channelIdLoading, channelIdMissing, onChannelIdResolved,
}) {
  const showToast = useToast()

  // ── "Add competitor by URL" — always visible, no server call needed ──────────
  const [addUrl,   setAddUrl]   = useState('')
  const [addError, setAddError] = useState(null)

  function handleAddByUrl() {
    const val = addUrl.trim()
    if (!val) return
    if (!val.includes('youtube.com') && !val.includes('youtu.be')) {
      setAddError('Please enter a YouTube channel URL (youtube.com/…)')
      return
    }
    // Normalise: ensure https and www
    let url = val
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url
    url = url.replace('://youtube.com', '://www.youtube.com')
    // Extract a display name: @handle or last path segment
    const handle = url.match(/@([\w.-]+)/)?.[1]
      ?? url.split('/').filter(Boolean).pop()
      ?? 'Channel'
    onAdd({
      channelId: `custom_${url}`,
      name:      handle,
      handle:    handle.startsWith('@') ? handle : `@${handle}`,
      avatar:    null,
      subs:      '',
    })
    setAddUrl('')
    setAddError(null)
    showToast(`@${handle} added to Tracking`)
  }

  // ── "Link your channel" — only for AI suggestions, uses pulse.onboard ────────
  const [myChannelUrl,     setMyChannelUrl]     = useState('')
  const [myChannelLoading, setMyChannelLoading] = useState(false)
  const [myChannelError,   setMyChannelError]   = useState(null)
  const [foundChannels,    setFoundChannels]    = useState([]) // streaming results while searching

  async function handleLinkChannel() {
    const val = myChannelUrl.trim()
    if (!val) return
    setMyChannelLoading(true)
    setMyChannelError(null)
    setFoundChannels([])
    try {
      const data = await pulse.onboard(val)
      let id = data?.channel?.channelId ?? data?.profile?.channelId ?? null
      if (!id && data?.analysisId) {
        id = await pollForChannelId(data.analysisId, setFoundChannels)
      }
      if (!id) throw new Error('No channel ID in response')
      onChannelIdResolved(id)
    } catch {
      setMyChannelError('Could not find that channel. Check the URL and try again.')
    } finally {
      setMyChannelLoading(false)
      setFoundChannels([])
    }
  }

  function pollForChannelId(analysisId, onProgress, timeoutMs = 90_000) {
    return new Promise((resolve, reject) => {
      const deadline = setTimeout(() => { clearInterval(iv); reject(new Error('Timed out')) }, timeoutMs)
      const iv = setInterval(async () => {
        try {
          const data = await pulse.onboardStatus(analysisId)
          // Surface any partial channels the server has found so far
          const partial = data.peers ?? data.channels ?? data.competitors ?? data.found ?? []
          if (partial.length) onProgress(partial)
          if (data.status === 'complete') {
            clearInterval(iv); clearTimeout(deadline)
            resolve(data?.channel?.channelId ?? data?.profile?.channelId ?? null)
          } else if (data.status === 'failed') {
            clearInterval(iv); clearTimeout(deadline)
            reject(new Error(data.error || 'Analysis failed'))
          }
        } catch { /* keep polling */ }
      }, 3000)
    })
  }

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (channelIdLoading) {
    return (
      <div className="loading-screen" style={{ height: 200 }}>
        <div className="spinner" />
      </div>
    )
  }

  const visibleCompetitors = (competitors ?? []).filter(c => !trackedIds.has(c.id) && !dismissed.has(c.id))
  const hasCompetitors = visibleCompetitors.length > 0
  const hasSuggested   = channels.length > 0

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── ADD COMPETITOR BY URL (always shown) ── */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
        padding: '12px 14px',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
          Track a competitor
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="input-wrap" style={{ flex: 1, marginBottom: 0 }}>
            <input
              type="url"
              placeholder="https://youtube.com/@competitorhandle"
              value={addUrl}
              onChange={e => { setAddUrl(e.target.value); setAddError(null); setAddSuccess('') }}
              onKeyDown={e => e.key === 'Enter' && handleAddByUrl()}
            />
            <span className="input-icon"><Tv size={15} strokeWidth={1.75} /></span>
          </div>
          <button
            className="btn-primary"
            onClick={handleAddByUrl}
            disabled={!addUrl.trim()}
            style={{ flexShrink: 0, padding: '0 14px', height: 44, fontSize: 13 }}
          >
            Track
          </button>
        </div>
        {addError && <div style={{ fontSize: 12, color: '#ff7070', marginTop: 6 }}>{addError}</div>}
      </div>

      {/* ── LINK YOUR OWN CHANNEL for AI suggestions (only when missing) ── */}
      {channelIdMissing && (
        <div style={{
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 14px',
        }}>
          {!myChannelLoading ? (
            /* ── Normal: URL input ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Link YOUR channel for AI suggestions</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                This is <strong>your own</strong> YouTube channel — not a competitor's. We'll analyse it once to find matching competitors automatically.
              </div>
              <div className="input-wrap" style={{ marginBottom: 0 }}>
                <input
                  type="url"
                  placeholder="https://youtube.com/@yourchannel"
                  value={myChannelUrl}
                  onChange={e => { setMyChannelUrl(e.target.value); setMyChannelError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleLinkChannel()}
                />
                <span className="input-icon"><Tv size={15} strokeWidth={1.75} /></span>
              </div>
              {myChannelError && (
                <div style={{ fontSize: 12, color: '#ff7070' }}>{myChannelError}</div>
              )}
              <button
                className="btn-primary"
                disabled={!myChannelUrl.trim()}
                onClick={handleLinkChannel}
                style={{ marginTop: 0 }}
              >
                Find my competitors →
              </button>
            </div>
          ) : (
            /* ── Loading: live channel stream ── */
            <ScanningUI foundChannels={foundChannels} />
          )}
        </div>
      )}

      {/* ── AI-scored competitors loading ── */}
      {!channelIdMissing && competitors === null && !competitorsError && (
        <div className="loading-screen" style={{ height: 100 }}>
          <div className="spinner" />
        </div>
      )}

      {!channelIdMissing && competitorsError && (
        <div style={{ fontSize: 12, color: 'var(--gray)', textAlign: 'center', padding: '8px 0' }}>
          Could not load AI competitors
        </div>
      )}

      {hasCompetitors && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            AI-matched · {visibleCompetitors.length} channels
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visibleCompetitors.map(c => (
              <CompetitorCard
                key={c.id}
                competitor={c}
                isTracked={trackedIds.has(c.id)}
                onAdd={() => onAdd({ channelId: c.id, name: c.name, handle: c.handle, avatar: c.thumbnail_url, subs: fmtSubs(c.subscriber_count) })}
                onRemove={() => onRemove(c.id)}
                onDismiss={() => onDismiss(c.id)}
              />
            ))}
          </div>
        </>
      )}

      {hasSuggested && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: hasCompetitors ? 4 : 0 }}>
            Suggested · {channels.length} channels
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {channels.map(ch => (
              <DiscoverCard
                key={ch.channelId}
                channel={ch}
                isTracked={trackedIds.has(ch.channelId)}
                onAdd={onAdd}
                onRemove={onRemove}
                onDismiss={onDismiss}
              />
            ))}
          </div>
        </>
      )}

      {!channelIdMissing && !hasCompetitors && !hasSuggested && competitors !== null && (
        <div style={{ margin: '32px 0', textAlign: 'center', color: 'var(--gray)', fontSize: 13 }}>
          No suggestions right now — add competitors above using a YouTube URL.
        </div>
      )}
    </div>
  )
}

function CompetitorRow({ name, src, isTracked, onAdd, onRemove, onDismiss }) {
  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
      padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <Avatar name={name} src={src} size={32} />
      <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name}
      </div>
      <button
        onClick={() => isTracked ? onRemove() : onAdd()}
        aria-label={isTracked ? 'Tracking' : 'Track'}
        style={{
          width: 32, height: 32, borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isTracked ? 'var(--surface2)' : 'var(--primary)',
          color:      isTracked ? 'var(--gray)'     : '#fff',
          flexShrink: 0,
        }}
      >
        {isTracked ? <Check size={16} /> : <Plus size={16} />}
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          width: 32, height: 32, borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface2)', color: 'var(--gray)',
          flexShrink: 0,
        }}
      >
        <X size={16} />
      </button>
    </div>
  )
}

function CompetitorCard({ competitor: c, isTracked, onAdd, onRemove, onDismiss }) {
  return (
    <CompetitorRow
      name={c.name}
      src={c.thumbnail_url}
      isTracked={isTracked}
      onAdd={onAdd}
      onRemove={onRemove}
      onDismiss={onDismiss}
    />
  )
}

function DiscoverCard({ channel: ch, isTracked, onAdd, onRemove, onDismiss }) {
  return (
    <CompetitorRow
      name={ch.name}
      src={ch.avatar}
      isTracked={isTracked}
      onAdd={() => onAdd(ch)}
      onRemove={() => onRemove(ch.channelId)}
      onDismiss={() => onDismiss(ch.channelId)}
    />
  )
}

function fmtSubs(n) {
  if (!n) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

// ── Activity tab ──────────────────────────────────────────────────────────────

function ActivityTab({ activity, loading, error, hasTracked, seen, onRetry, onPlayVideo }) {
  if (!hasTracked) {
    return (
      <EmptyState
        emoji="📡"
        title="No channels tracked yet"
        body="Track competitors in the Tracking tab — their latest posts will appear here."
      />
    )
  }

  if (loading || activity === null) {
    return (
      <div className="loading-screen" style={{ height: 300 }}>
        <div className="spinner" />
        <span style={{ marginTop: 10, fontSize: 13, color: 'var(--muted)' }}>Fetching latest posts…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ margin: '40px 20px', textAlign: 'center' }}>
        <div style={{ color: '#ff7070', fontSize: 13, marginBottom: 14 }}>Could not load activity — {error}</div>
        <button className="btn-primary" style={{ maxWidth: 180, margin: '0 auto' }} onClick={onRetry}>
          Retry
        </button>
      </div>
    )
  }

  if (!activity.length) {
    return (
      <div style={{ margin: '52px 20px', textAlign: 'center', color: 'var(--gray)' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔇</div>
        <div style={{ fontWeight: 700, color: 'var(--light)', fontSize: 15, marginBottom: 6 }}>No recent activity</div>
        <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
          None of your tracked channels have posted recently, or their feeds could not be loaded.
        </div>
        <button className="btn-primary" style={{ maxWidth: 180, margin: '0 auto' }} onClick={onRetry}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {activity.map(v => (
        <ActivityCard key={v.videoId} video={v} isNew={!seen.has(v.videoId)} onPlay={onPlayVideo} />
      ))}
    </div>
  )
}

function ActivityCard({ video: v, isNew, onPlay }) {
  return (
    <div
      onClick={() => onPlay(v)}
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: '12px 14px',
        display: 'flex',
        gap: 12,
        cursor: 'pointer',
        alignItems: 'flex-start',
        borderLeft: isNew ? '3px solid var(--primary)' : '3px solid transparent',
        textDecoration: 'none',
      }}
    >
      {/* Thumbnail */}
      {v.thumbnail ? (
        <img
          src={v.thumbnail}
          alt=""
          style={{ width: 88, height: 50, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 88, height: 50, borderRadius: 6, flexShrink: 0,
          background: 'var(--surface2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Play size={16} color="var(--gray)" />
        </div>
      )}

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 3 }}>
          {v.channelName}
        </div>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--light)',
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {v.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4 }}>
          {timeAgo(v.publishedAt)}
        </div>
      </div>
    </div>
  )
}

// ── In-app video modal ────────────────────────────────────────────────────────

function VideoModal({ video, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 820,
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, borderBottom: '1px solid var(--surface2)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 3 }}>
              {video.channelName}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--light)', lineHeight: 1.35 }}>
              {video.title}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--surface2)', color: 'var(--gray)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
        {/* 16:9 embed */}
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title={video.title}
          />
        </div>
      </div>
    </div>
  )
}

// ── Channel modal (recent uploads list) ───────────────────────────────────────

function ChannelModal({ channel, onClose, onPlay }) {
  const [videos,  setVideos]  = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const vids = await fetchYouTubeRSS([channel])
        if (!cancelled) setVideos(vids)
      } catch {
        if (!cancelled) setVideos([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [channel.channelId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 580,
          maxHeight: '80vh',
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid var(--surface2)',
          flexShrink: 0,
        }}>
          <Avatar name={channel.name} src={channel.thumbnail_url} size={36} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {channel.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Recent uploads</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--surface2)', color: 'var(--gray)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Scrollable video list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div className="loading-screen" style={{ height: 180 }}>
              <div className="spinner" />
            </div>
          )}
          {!loading && (!videos?.length) && (
            <div style={{ padding: 32, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              No recent videos found
            </div>
          )}
          {!loading && videos?.length > 0 && videos.map((v, i) => (
            <button
              key={v.videoId}
              onClick={() => onPlay(v)}
              style={{
                width: '100%', display: 'flex', gap: 12,
                padding: '10px 16px', alignItems: 'flex-start',
                background: 'none', textAlign: 'left',
                borderBottom: i < videos.length - 1 ? '1px solid var(--surface2)' : 'none',
              }}
            >
              {v.thumbnail ? (
                <img src={v.thumbnail} alt="" style={{ width: 88, height: 50, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 88, height: 50, borderRadius: 5, background: 'var(--surface2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={14} color="var(--gray)" />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--light)', lineHeight: 1.4,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {v.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 3 }}>{timeAgo(v.publishedAt)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Scanning UI (shown while competitor search is running) ───────────────────

const SCAN_MESSAGES = [
  'Analysing your content…',
  'Scanning your niche…',
  'Identifying competitor channels…',
  'Scoring matches…',
]

function ScanningUI({ foundChannels }) {
  const [progress, setProgress] = useState(0)

  // Fake progress bar: fills to ~85% over 35 s, then stalls until done
  useEffect(() => {
    const iv = setInterval(() => {
      setProgress(p => {
        if (p >= 85) return p
        const step = (85 / 35000) * 250 + (Math.random() - 0.45) * 0.4
        return Math.min(p + step, 85)
      })
    }, 250)
    return () => clearInterval(iv)
  }, [])

  const msgIdx = Math.min(Math.floor(progress / 22), SCAN_MESSAGES.length - 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {SCAN_MESSAGES[msgIdx]}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
            {foundChannels.length > 0
              ? `${foundChannels.length} channel${foundChannels.length !== 1 ? 's' : ''} found so far…`
              : 'This takes 20–40 seconds'}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: 'linear-gradient(90deg, rgba(99,102,241,0.9), rgba(29,185,84,0.8))',
          width: `${progress}%`,
          transition: 'width 0.25s ease-out',
        }} />
      </div>

      {/* Live channel list */}
      {foundChannels.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>
            Channels found
          </div>
          {foundChannels.map((ch, i) => (
            <FoundChannelRow key={ch.channelId ?? ch.id ?? i} channel={ch} />
          ))}
        </div>
      )}
    </div>
  )
}

function FoundChannelRow({ channel: ch }) {
  const [fresh, setFresh] = useState(true)

  // Green "just found" flash fades after 1.5 s
  useEffect(() => {
    const t = setTimeout(() => setFresh(false), 1500)
    return () => clearTimeout(t)
  }, [])

  const name = ch.name ?? ch.channelName ?? ch.handle ?? 'Unknown Channel'
  const src  = ch.thumbnail_url ?? ch.avatar ?? null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 8px', borderRadius: 6,
      background: fresh ? 'rgba(29,185,84,0.08)' : 'transparent',
      transition: 'background 1s ease',
    }}>
      <Avatar name={name} src={src} size={28} />
      <div style={{
        flex: 1, minWidth: 0,
        fontSize: 13, fontWeight: 600,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        color: 'var(--light)',
      }}>
        {name}
      </div>
      {fresh && (
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: 'var(--secondary)',
          background: 'rgba(29,185,84,0.15)',
          padding: '2px 7px', borderRadius: 100, flexShrink: 0,
        }}>
          found
        </span>
      )}
    </div>
  )
}

// ── Shared components ─────────────────────────────────────────────────────────

function Avatar({ name, src, size = 44 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--surface2)', overflow: 'hidden', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: Math.round(size * 0.36),
    }}>
      {src
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (name?.[0] ?? '?')
      }
    </div>
  )
}

function EmptyState({ emoji, title, body }) {
  return (
    <div style={{ margin: '52px 20px', textAlign: 'center', color: 'var(--gray)' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontWeight: 700, color: 'var(--light)', fontSize: 15, marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>{body}</div>
    </div>
  )
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

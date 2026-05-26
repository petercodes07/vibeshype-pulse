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

// ── Main component ────────────────────────────────────────────────────────────

export default function Rivals() {
  const [tab, setTab] = useState(0) // 0=tracking 1=discover 2=activity

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

  const [activity,      setActivity]      = useState(null) // null = not yet loaded
  const [activityError, setActivityError] = useState(null)
  const [activityLoading, setActivityLoading] = useState(false)

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

    setActivityLoading(true)
    setActivityError(null)
    const ids = tracked.map(t => t.channelId).join(',')
    rivals.activity(ids)
      .then(data => setActivity(data.videos ?? []))
      .catch(err  => { setActivityError(err.message); setActivity([]) })
      .finally(() => setActivityLoading(false))
  }, [tab]) // intentionally only re-fetches when tab changes

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
      {tab === 1 && (
        <ActivityTab
          activity={activity}
          loading={activityLoading}
          error={activityError}
          hasTracked={tracked.length > 0}
          seen={seen}
        />
      )}
    </div>
  )
}

// ── Discover tab ──────────────────────────────────────────────────────────────

function DiscoverTab({
  channels, competitors, competitorsError,
  trackedIds, dismissed, onAdd, onDismiss, onRemove,
  channelIdLoading, channelIdMissing, onChannelIdResolved,
}) {
  const [manualUrl,     setManualUrl]     = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError,   setManualError]   = useState(null)

  async function handleManualSubmit() {
    const val = manualUrl.trim()
    if (!val) return
    setManualLoading(true)
    setManualError(null)
    try {
      const data = await pulse.onboard(val)
      const id = data?.profile?.channelId
      if (!id) throw new Error('No channel ID returned')
      onChannelIdResolved(id)
    } catch (err) {
      setManualError('Could not resolve channel. Check the URL and try again.')
    } finally {
      setManualLoading(false)
    }
  }

  // Still resolving channel ID from server
  if (channelIdLoading) {
    return (
      <div className="loading-screen" style={{ height: 200 }}>
        <div className="spinner" />
      </div>
    )
  }

  // Couldn't get channelId from localStorage or server — ask the user
  if (channelIdMissing) {
    return (
      <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Link your channel</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          We need your YouTube channel URL to find AI-matched competitors.
        </div>
        <div className="input-wrap" style={{ marginBottom: 0 }}>
          <input
            type="url"
            placeholder="https://youtube.com/@yourchannel"
            value={manualUrl}
            onChange={e => setManualUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
          />
          <span className="input-icon"><Tv size={15} strokeWidth={1.75} /></span>
        </div>
        {manualError && (
          <div style={{ fontSize: 12, color: '#ff7070', lineHeight: 1.5 }}>{manualError}</div>
        )}
        <button
          className="btn-primary"
          disabled={!manualUrl.trim() || manualLoading}
          onClick={handleManualSubmit}
        >
          {manualLoading ? 'Analysing…' : 'Find my competitors →'}
        </button>
      </div>
    )
  }

  const visibleCompetitors = (competitors ?? []).filter(c => !trackedIds.has(c.id) && !dismissed.has(c.id))
  const hasCompetitors = visibleCompetitors.length > 0
  const hasSuggested   = channels.length > 0

  if (!hasCompetitors && !hasSuggested && competitors !== null) {
    return (
      <EmptyState
        emoji="✅"
        title="You're all caught up"
        body="No suggestions right now. Re-run onboarding to refresh recommendations."
      />
    )
  }

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* AI-scored competitors loading */}
      {competitors === null && !competitorsError && (
        <div className="loading-screen" style={{ height: 120 }}>
          <div className="spinner" />
        </div>
      )}

      {competitorsError && (
        <div style={{ fontSize: 12, color: 'var(--gray)', textAlign: 'center', padding: '12px 0' }}>
          Could not load AI competitors
        </div>
      )}

      {hasCompetitors && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 4 }}>
            AI-matched · {visibleCompetitors.length} channels
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
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

      {/* Onboarding suggestions fallback */}
      {hasSuggested && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: hasCompetitors ? 8 : 4 }}>
            Suggested · {channels.length} channels
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
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

function ActivityTab({ activity, loading, error, hasTracked, seen }) {
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
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ margin: '40px 20px', textAlign: 'center', color: '#ff7070', fontSize: 13 }}>
        Could not load activity — {error}
      </div>
    )
  }

  if (!activity.length) {
    return (
      <EmptyState
        emoji="🔇"
        title="No recent activity"
        body="None of your tracked channels have posted recently."
      />
    )
  }

  return (
    <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {activity.map(v => (
        <ActivityCard key={v.videoId} video={v} isNew={!seen.has(v.videoId)} />
      ))}
    </div>
  )
}

function ActivityCard({ video: v, isNew }) {
  const ytUrl = `https://youtube.com/watch?v=${v.videoId}`

  return (
    <a
      href={ytUrl}
      target="_blank"
      rel="noreferrer"
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: '12px 14px',
        display: 'flex',
        gap: 12,
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
    </a>
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

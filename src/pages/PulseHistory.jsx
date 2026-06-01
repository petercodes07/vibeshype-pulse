/**
 * PulseHistory — Track Record
 *
 * #12: History is sourced from picks the user explicitly "posted"
 *      (stored in localStorage via utils/journal.js) merged with any
 *      server-side data from GET /api/pulse/history.  Client-side entries
 *      take precedence and fill the gap while the server catches up.
 *
 * #13: PerfBar removed — replaced by a single inline multiplier bar per
 *      card that shows the 7-day lift visually without 3 separate rows.
 *      Sort is per time-window: sort by "lift" uses the selected window's
 *      views/baseline rather than always 7d.
 */

import { useState, useEffect, useMemo } from 'react'
import { pulse } from '../api'
import { BarChart2, Music2, Copy, Check, Trophy, TrendingUp, TrendingDown, BookOpen } from 'lucide-react'
import HistoryFilters from '../components/HistoryFilters'
import { getAllEntries } from '../utils/journal'
import { useActiveChannel } from '../context/ActiveChannelContext'

// ── Mock fallback ─────────────────────────────────────────────────────────────

const MOCK_HISTORY = [
  {
    id: 'h1', title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars',
    cover: 'https://i.scdn.co/image/ab67616d0000b273f953f3a2b59e5e3bdd9bcc62',
    postedAt: '2026-05-26',
    views24h: 31200, views7d: 224000, views30d: 610000,
    baseline24h: 8200, baseline7d: 61000, baseline30d: 160000,
  },
  {
    id: 'h2', title: 'APT.', artist: 'ROSÉ & Bruno Mars',
    cover: 'https://i.scdn.co/image/ab67616d0000b2739bbfd3a54a73522f2f38c9ef',
    postedAt: '2026-05-22',
    views24h: 28400, views7d: 198000, views30d: 540000,
    baseline24h: 8200, baseline7d: 61000, baseline30d: 160000,
  },
  {
    id: 'h3', title: 'Espresso', artist: 'Sabrina Carpenter',
    cover: 'https://i.scdn.co/image/ab67616d0000b273e2e352d89826aef6dbd5ff8f',
    postedAt: '2026-05-18',
    views24h: 22100, views7d: 189000, views30d: 510000,
    baseline24h: 8200, baseline7d: 61000, baseline30d: 160000,
  },
  {
    id: 'h4', title: 'Cruel Summer', artist: 'Taylor Swift',
    cover: null, postedAt: '2026-05-14',
    views24h: 18400, views7d: 142000, views30d: 380000,
    baseline24h: 8200, baseline7d: 61000, baseline30d: 160000,
  },
  {
    id: 'h5', title: 'As It Was', artist: 'Harry Styles',
    cover: null, postedAt: '2026-05-09',
    views24h: 9100, views7d: 78000, views30d: 201000,
    baseline24h: 8200, baseline7d: 61000, baseline30d: 160000,
  },
  {
    id: 'h6', title: 'Flowers', artist: 'Miley Cyrus',
    cover: null, postedAt: '2026-05-04',
    views24h: 7800, views7d: 65000, views30d: 174000,
    baseline24h: 8200, baseline7d: 61000, baseline30d: 160000,
  },
  {
    id: 'h7', title: 'Blinding Lights', artist: 'The Weeknd',
    cover: null, postedAt: '2026-04-28',
    views24h: 7200, views7d: 54000, views30d: 130000,
    baseline24h: 8200, baseline7d: 61000, baseline30d: 160000,
  },
  {
    id: 'h8', title: 'Levitating', artist: 'Dua Lipa',
    cover: null, postedAt: '2026-04-22',
    views24h: 5100, views7d: 38000, views30d: 95000,
    baseline24h: 8200, baseline7d: 61000, baseline30d: 160000,
  },
]

// ── Window helper — maps timeFilter to views/baseline keys ───────────────────

function windowKeys(timeFilter) {
  if (timeFilter === 'Last 7 days')  return { v: 'views7d',  b: 'baseline7d'  }
  if (timeFilter === 'Last 30 days') return { v: 'views30d', b: 'baseline30d' }
  return                                    { v: 'views7d',  b: 'baseline7d'  } // default
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PulseHistory() {
  const { activeChannel } = useActiveChannel()
  const [serverHistory, setServerHistory] = useState(null)
  const [query,         setQuery]         = useState('')
  const [timeFilter,    setTimeFilter]    = useState('All time')
  const [perfFilter,    setPerfFilter]    = useState('All')
  const [sort,          setSort]          = useState('recent')
  const journalEntries = useMemo(() => getAllEntries(), [])

  useEffect(() => {
    setServerHistory(null)
    pulse.history()
      .then(data => setServerHistory(data.picks ?? []))
      .catch(() => setServerHistory(MOCK_HISTORY))
  }, [activeChannel?.channelId])

  // #12 — merge server history with locally-posted picks from the journal.
  // Journal entries keyed by pick ID represent user-confirmed "posted" actions.
  // Build stub history items for any journal entries not yet reflected server-side.
  const history = useMemo(() => {
    if (serverHistory === null) return null
    const serverIds = new Set((serverHistory).map(h => h.id))
    const localStubs = Object.entries(journalEntries)
      .filter(([id]) => !serverIds.has(id))
      .map(([id, entry]) => ({
        id,
        title:     entry.title    ?? id,
        artist:    entry.artist   ?? '',
        cover:     entry.cover    ?? null,
        postedAt:  entry.savedAt  ?? new Date().toISOString(),
        // no view data yet — server hasn't caught up
      }))
    return [...serverHistory, ...localStubs]
  }, [serverHistory, journalEntries])

  // #13 — sort uses the active time window's views/baseline, not always 7d
  const wk = windowKeys(timeFilter)

  const items = useMemo(() => {
    if (!history) return []
    const now = Date.now()
    const q = query.trim().toLowerCase()
    const filtered = history.filter(h => {
      const ts = new Date(h.postedAt).getTime()
      if (timeFilter === 'Last 7 days'  && now - ts > 7  * 86_400_000) return false
      if (timeFilter === 'Last 30 days' && now - ts > 30 * 86_400_000) return false
      if (perfFilter !== 'All') {
        const mult = h[wk.b] ? h[wk.v] / h[wk.b] : null
        if (mult == null)                                  return false
        if (perfFilter === 'Above baseline' && mult <  1) return false
        if (perfFilter === 'Below baseline' && mult >= 1) return false
      }
      if (q) {
        const hay = `${h.title ?? ''} ${h.artist ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    const sorted = [...filtered]
    if (sort === 'lift') {
      // #13: lift sorts by the active window
      sorted.sort((a, b) =>
        (b[wk.v] / (b[wk.b] || 1)) - (a[wk.v] / (a[wk.b] || 1))
      )
    } else if (sort === 'views') {
      sorted.sort((a, b) => ((b[wk.v] ?? 0) - (a[wk.v] ?? 0)))
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => new Date(a.postedAt) - new Date(b.postedAt))
    } else {
      sorted.sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt))
    }
    return sorted
  }, [history, query, timeFilter, perfFilter, sort, wk])

  const filtersActive = query.length > 0 || timeFilter !== 'All time' || perfFilter !== 'All'

  // Stats — use active window
  const avgMultiplier = items.filter(h => h[wk.b]).length
    ? (items.filter(h => h[wk.b]).reduce((s, h) => s + h[wk.v] / h[wk.b], 0) / items.filter(h => h[wk.b]).length).toFixed(1)
    : '—'
  const totalViews = items.reduce((s, h) => s + (h[wk.v] || 0), 0)
  const bestPick   = items.reduce((best, h) =>
    (h[wk.v] ?? 0) > (best?.[wk.v] ?? 0) ? h : best, null)

  return (
    <div className="screen">

      {/* ── Header ── */}
      <div className="section-header">
        <div className="section-title">Track Record</div>
        <div className="section-sub">Performance of every pick you've posted.</div>
      </div>

      {history === null ? (
        <div className="loading-screen" style={{ height: 300 }}>
          <div className="spinner" />
        </div>
      ) : history.length === 0 ? (
        <div style={{ margin: '40px 20px', textAlign: 'center', color: 'var(--gray)' }}>
          <div style={{ marginBottom: 12 }}>
            <BarChart2 size={48} strokeWidth={1.25} style={{ color: 'var(--muted)' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--light)', marginBottom: 6 }}>
            No picks posted yet
          </div>
          <div style={{ fontSize: 13 }}>
            Hit "Post it" on any Today's pick — it'll show up here.
          </div>
        </div>
      ) : (
        <>
          {/* ── Stats row ── */}
          <div className="stat-row">
            <div className="stat-box">
              <div className="stat-value">{avgMultiplier}×</div>
              <div className="stat-label">
                Avg lift · {timeFilter === 'All time' ? '7d' : timeFilter === 'Last 7 days' ? '7d' : '30d'}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{fmtK(totalViews)}</div>
              <div className="stat-label">Total views</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{items.length}</div>
              <div className="stat-label">Picks posted</div>
            </div>
          </div>

          {/* ── Best performer callout ── */}
          {bestPick && bestPick[wk.v] > 0 && (
            <div style={{
              margin: '0 16px 14px',
              background: 'linear-gradient(135deg, rgba(255,200,50,0.1), rgba(255,59,59,0.06))',
              border: '1px solid rgba(255,200,50,0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <Trophy size={20} strokeWidth={1.75} color="#ffc832" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#ffc832', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 2 }}>
                  Best pick
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {bestPick.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{bestPick.artist}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#ffc832' }}>
                  {bestPick[wk.b] ? (bestPick[wk.v] / bestPick[wk.b]).toFixed(1) : fmtK(bestPick[wk.v])}
                  {bestPick[wk.b] ? '×' : ' views'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {timeFilter === 'Last 30 days' ? '30d' : '7d'} lift
                </div>
              </div>
            </div>
          )}

          {/* ── Search & filters ── */}
          <HistoryFilters
            query={query}            onQueryChange={setQuery}
            timeFilter={timeFilter}  onTimeFilterChange={setTimeFilter}
            perfFilter={perfFilter}  onPerfFilterChange={setPerfFilter}
            sort={sort}              onSortChange={setSort}
            resultCount={items.length}
          />

          {/* ── History list ── */}
          {items.length === 0 ? (
            <div style={{ margin: '32px 16px', textAlign: 'center', color: 'var(--gray)', fontSize: 13 }}>
              {filtersActive ? 'No picks match your filters.' : 'No picks in this period.'}
            </div>
          ) : (
            <div className="history-list">
              {items.map(item => (
                <HistoryItem
                  key={item.id}
                  item={item}
                  isBest={item.id === bestPick?.id}
                  journal={journalEntries[item.id] ?? null}
                  windowKeys={wk}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── History item ──────────────────────────────────────────────────────────────

function HistoryItem({ item, isBest, journal, windowKeys: wk }) {
  const [coverFailed, setCoverFailed] = useState(false)
  const [copied,      setCopied]      = useState(false)

  const views   = item[wk.v] ?? null
  const base    = item[wk.b] ?? null
  const mult    = base && views != null ? views / base : null
  const isAbove = mult != null && mult >= 1.0
  // #13 — single bar width: 50% = baseline, scale linearly up to 100% at 2× baseline
  const barPct  = base && views != null ? Math.min((views / base) * 50, 100) : 0
  const showCover = item.cover && !coverFailed

  function handleCopy(e) {
    e.stopPropagation()
    const text = item.artist ? `${item.title} - ${item.artist}` : item.title
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="history-item"
      style={{ borderLeft: isBest ? '3px solid #ffc832' : '3px solid transparent' }}
    >
      <div className="history-item-top">

        {/* Cover */}
        <div className="history-cover">
          {showCover ? (
            <img
              src={item.cover}
              alt=""
              onError={() => setCoverFailed(true)}
              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, display: 'block' }}
            />
          ) : (
            <div style={{
              width: 64, height: 64, borderRadius: 8,
              background: coverGradient(item.title),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Music2 size={22} strokeWidth={1.5} color="rgba(255,255,255,0.5)" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="history-body" style={{ flex: 1, minWidth: 0 }}>
          <div className="history-title-text">{item.title}</div>
          <div className="history-artist-text">{item.artist}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <div className="history-date">{formatDate(item.postedAt)}</div>
            {isBest && (
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#ffc832',
                background: 'rgba(255,200,50,0.12)',
                padding: '2px 6px', borderRadius: 100,
              }}>
                🏆 Best
              </span>
            )}
          </div>
        </div>

        {/* Multiplier + copy */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          {mult != null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {isAbove
                ? <TrendingUp   size={13} strokeWidth={2} color="var(--secondary)" />
                : <TrendingDown size={13} strokeWidth={2} color="var(--primary)" />
              }
              <span style={{ fontSize: 15, fontWeight: 800, color: isAbove ? 'var(--secondary)' : 'var(--primary)' }}>
                {mult.toFixed(1)}×
              </span>
            </div>
          ) : views != null ? (
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>
              {fmtK(views)}
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--gray)', fontStyle: 'italic' }}>pending</span>
          )}
          <button
            onClick={handleCopy}
            title="Copy song title"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 6,
              background: copied ? 'rgba(29,185,84,0.15)' : 'var(--surface2)',
              color: copied ? 'var(--secondary)' : 'var(--gray)',
              fontSize: 10, fontWeight: 700,
              transition: 'all 0.15s',
            }}
          >
            {copied ? <Check size={10} strokeWidth={2.5} /> : <Copy size={10} strokeWidth={2} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* #13 — single inline multiplier bar (replaces 3-row PerfBar) */}
      {views != null && (
        <div style={{ padding: '8px 14px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 10, color: 'var(--gray)', marginBottom: 5,
          }}>
            <span>{fmtK(views)} views</span>
            {base && <span style={{ color: isAbove ? 'var(--secondary)' : 'var(--primary)' }}>
              {isAbove ? '+' : ''}{((mult - 1) * 100).toFixed(0)}% vs baseline
            </span>}
          </div>
          <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${barPct}%`,
              background: isAbove ? 'var(--secondary)' : 'var(--primary)',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      )}

      {/* Journal note */}
      {journal && (
        <div style={{
          padding: '6px 14px 10px',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', gap: 7,
        }}>
          <BookOpen size={12} strokeWidth={1.75} style={{ color: 'var(--secondary)', flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {journal.variant && journal.variant !== 'original' && (
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.5px', color: 'var(--secondary)',
                background: 'rgba(29,185,84,0.12)',
                padding: '2px 6px', borderRadius: 100, marginRight: 6,
              }}>
                {journal.variant}
              </span>
            )}
            {journal.note
              ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>{journal.note}</span>
              : <span style={{ fontSize: 12, color: 'var(--gray)', fontStyle: 'italic' }}>no note</span>
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtK(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const GRADIENTS = [
  ['#1a1a2e', '#16213e'], ['#2d1b69', '#11998e'], ['#1a0533', '#6a0572'],
  ['#0f3460', '#533483'], ['#16213e', '#e94560'], ['#1b1b2f', '#e43f5a'],
  ['#162447', '#1f4068'], ['#2c003e', '#5c0099'],
]
function coverGradient(title = '') {
  const i = [...title].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length
  const [a, b] = GRADIENTS[i]
  return `linear-gradient(135deg, ${a}, ${b})`
}

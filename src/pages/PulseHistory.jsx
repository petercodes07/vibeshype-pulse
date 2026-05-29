import { useState, useEffect } from 'react'
import { pulse } from '../api'
import { BarChart2, Music2, Copy, Check, Trophy, TrendingUp, TrendingDown } from 'lucide-react'

// ── Mock fallback data (used when server isn't available) ─────────────────────

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
    cover: null,
    postedAt: '2026-05-14',
    views24h: 18400, views7d: 142000, views30d: 380000,
    baseline24h: 8200, baseline7d: 61000, baseline30d: 160000,
  },
  {
    id: 'h5', title: 'As It Was', artist: 'Harry Styles',
    cover: null,
    postedAt: '2026-05-09',
    views24h: 9100, views7d: 78000, views30d: 201000,
    baseline24h: 8200, baseline7d: 61000, baseline30d: 160000,
  },
  {
    id: 'h6', title: 'Flowers', artist: 'Miley Cyrus',
    cover: null,
    postedAt: '2026-05-04',
    views24h: 7800, views7d: 65000, views30d: 174000,
    baseline24h: 8200, baseline7d: 61000, baseline30d: 160000,
  },
  {
    id: 'h7', title: 'Blinding Lights', artist: 'The Weeknd',
    cover: null,
    postedAt: '2026-04-28',
    views24h: 7200, views7d: 54000, views30d: 130000,
    baseline24h: 8200, baseline7d: 61000, baseline30d: 160000,
  },
  {
    id: 'h8', title: 'Levitating', artist: 'Dua Lipa',
    cover: null,
    postedAt: '2026-04-22',
    views24h: 5100, views7d: 38000, views30d: 95000,
    baseline24h: 8200, baseline7d: 61000, baseline30d: 160000,
  },
]

const FILTERS = ['All time', 'Last 30 days', 'Last 7 days']

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PulseHistory() {
  const [history,  setHistory]  = useState(null)
  const [filter,   setFilter]   = useState('All time')

  useEffect(() => {
    pulse.history()
      .then(data => setHistory(data.picks ?? []))
      .catch(() => setHistory(MOCK_HISTORY))
  }, [])

  // Apply time filter
  const now = Date.now()
  const items = (history ?? []).filter(h => {
    if (filter === 'Last 7 days')  return now - new Date(h.postedAt).getTime() <= 7  * 86_400_000
    if (filter === 'Last 30 days') return now - new Date(h.postedAt).getTime() <= 30 * 86_400_000
    return true
  })

  // Stats
  const avgMultiplier = items.length
    ? (items.reduce((s, h) => s + (h.views7d / (h.baseline7d || 1)), 0) / items.length).toFixed(1)
    : '—'
  const totalViews = items.reduce((s, h) => s + (h.views7d || 0), 0)
  const bestPick   = items.reduce((best, h) => (h.views7d > (best?.views7d ?? 0) ? h : best), null)

  return (
    <div className="screen">

      {/* ── Header ── */}
      <div className="section-header">
        <div className="section-title">Track Record</div>
        <div className="section-sub">How your posted picks performed vs your baseline.</div>
      </div>

      {history === null ? (
        <div className="loading-screen" style={{ height: 300 }}>
          <div className="spinner" />
        </div>
      ) : items.length === 0 && filter === 'All time' ? (

        /* ── Empty state ── */
        <div style={{ margin: '40px 20px', textAlign: 'center', color: 'var(--gray)' }}>
          <div style={{ marginBottom: 12 }}>
            <BarChart2 size={48} strokeWidth={1.25} style={{ color: 'var(--muted)' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--light)', marginBottom: 6 }}>
            No results yet
          </div>
          <div style={{ fontSize: 13 }}>
            Accept a pick and post it — results appear here after 24 hours.
          </div>
        </div>

      ) : (
        <>
          {/* ── Stats row ── */}
          <div className="stat-row">
            <div className="stat-box">
              <div className="stat-value">{avgMultiplier}×</div>
              <div className="stat-label">Avg 7-day lift</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{fmtK(totalViews)}</div>
              <div className="stat-label">Total views (7d)</div>
            </div>
            <div className="stat-box">
              <div className="stat-value">{items.length}</div>
              <div className="stat-label">Picks posted</div>
            </div>
          </div>

          {/* ── Best performer callout ── */}
          {bestPick && (
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
                  {(bestPick.views7d / (bestPick.baseline7d || 1)).toFixed(1)}×
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>7-day lift</div>
              </div>
            </div>
          )}

          {/* ── Filter tabs ── */}
          <div style={{
            display: 'flex', gap: 6, padding: '0 16px', marginBottom: 12,
          }}>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '5px 12px', borderRadius: 100,
                  fontSize: 11, fontWeight: 700,
                  background: filter === f ? 'var(--primary)' : 'var(--surface2)',
                  color:      filter === f ? '#fff'           : 'var(--gray)',
                  transition: 'all 0.15s',
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* ── History list ── */}
          {items.length === 0 ? (
            <div style={{ margin: '32px 16px', textAlign: 'center', color: 'var(--gray)', fontSize: 13 }}>
              No picks in this time period.
            </div>
          ) : (
            <div className="history-list">
              {items.map((item, i) => (
                <HistoryItem
                  key={item.id}
                  item={item}
                  isBest={item.id === bestPick?.id}
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

function HistoryItem({ item, isBest }) {
  const [coverFailed, setCoverFailed] = useState(false)
  const [copied,      setCopied]      = useState(false)

  const mult7d  = item.baseline7d ? (item.views7d  / item.baseline7d)  : null
  const pct24h  = item.baseline24h ? Math.min((item.views24h / item.baseline24h) * 50, 100) : 0
  const pct7d   = item.baseline7d  ? Math.min((item.views7d  / item.baseline7d)  * 50, 100) : 0
  const pct30d  = item.baseline30d ? Math.min((item.views30d / item.baseline30d) * 50, 100) : 0
  const isAbove = mult7d != null && mult7d >= 1.0
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
          {mult7d != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {isAbove
                ? <TrendingUp  size={13} strokeWidth={2} color="var(--secondary)" />
                : <TrendingDown size={13} strokeWidth={2} color="var(--primary)" />
              }
              <span style={{ fontSize: 15, fontWeight: 800, color: isAbove ? 'var(--secondary)' : 'var(--primary)' }}>
                {mult7d.toFixed(1)}×
              </span>
            </div>
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

      {/* Performance bars */}
      {item.views24h != null && (
        <div className="history-perf">
          <PerfBar label="24h" views={item.views24h} pct={pct24h} above={isAbove} />
          <PerfBar label="7d"  views={item.views7d}  pct={pct7d}  above={isAbove} />
          <PerfBar label="30d" views={item.views30d} pct={pct30d} above={isAbove} />
        </div>
      )}
    </div>
  )
}

function PerfBar({ label, views, pct, above }) {
  return (
    <div className="perf-bar-wrap" style={{ marginBottom: 6 }}>
      <div className="perf-bar-label">
        <span>{label}</span>
        <span style={{ color: 'var(--light)', fontWeight: 600 }}>{fmtK(views)}</span>
      </div>
      <div className="perf-bar-track">
        <div
          className={`perf-bar-fill${above ? '' : ' below'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
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
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

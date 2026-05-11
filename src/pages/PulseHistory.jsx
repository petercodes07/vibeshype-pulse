import { useState, useEffect } from 'react'
import { pulse } from '../api'
import { BarChart2, Music2 } from 'lucide-react'

const MOCK_HISTORY = [
  {
    id: 'h1',
    title: 'Cruel Summer',
    artist: 'Taylor Swift',
    cover: null,
    postedAt: '2026-05-08',
    views24h: 18400,
    views7d: 142000,
    views30d: 380000,
    baseline24h: 8200,
    baseline7d: 61000,
    baseline30d: 160000,
  },
  {
    id: 'h2',
    title: 'Flowers',
    artist: 'Miley Cyrus',
    cover: null,
    postedAt: '2026-05-05',
    views24h: 22100,
    views7d: 189000,
    views30d: 510000,
    baseline24h: 8200,
    baseline7d: 61000,
    baseline30d: 160000,
  },
  {
    id: 'h3',
    title: 'As It Was',
    artist: 'Harry Styles',
    cover: null,
    postedAt: '2026-04-30',
    views24h: 9100,
    views7d: 78000,
    views30d: 201000,
    baseline24h: 8200,
    baseline7d: 61000,
    baseline30d: 160000,
  },
  {
    id: 'h4',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    cover: null,
    postedAt: '2026-04-24',
    views24h: 7200,
    views7d: 54000,
    views30d: 130000,
    baseline24h: 8200,
    baseline7d: 61000,
    baseline30d: 160000,
  },
]

export default function PulseHistory() {
  const [history, setHistory] = useState(null)

  useEffect(() => {
    pulse.history()
      .then(data => setHistory(data.picks ?? []))
      .catch(() => setHistory(MOCK_HISTORY))
  }, [])

  const items = history ?? []
  const avgMultiplier = items.length
    ? (items.reduce((s, h) => s + (h.views7d / (h.baseline7d || 1)), 0) / items.length).toFixed(2)
    : '—'
  const totalViews = items.reduce((s, h) => s + (h.views7d || 0), 0)
  const bestPick = items.reduce((best, h) => (h.views7d > (best?.views7d ?? 0) ? h : best), null)

  return (
    <div className="screen">
      <div className="section-header">
        <div className="section-title">Track Record</div>
        <div className="section-sub">How your accepted picks performed vs your baseline.</div>
      </div>

      {history === null ? (
        <div className="loading-screen" style={{ height: 300 }}>
          <div className="spinner" />
        </div>
      ) : items.length === 0 ? (
        <div style={{ margin: '40px 20px', textAlign: 'center', color: 'var(--gray)' }}>
          <div style={{ marginBottom: 12 }}><BarChart2 size={48} strokeWidth={1.25} style={{ color: 'var(--muted)' }} /></div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--light)', marginBottom: 6 }}>No results yet</div>
          <div style={{ fontSize: 13 }}>Accept a pick and post it — results appear here after 24 hours.</div>
        </div>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat-box">
              <div className="stat-value">{avgMultiplier}×</div>
              <div className="stat-label">Avg 7-day lift</div>
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

          <div className="history-list">
            {items.map(item => (
              <HistoryItem key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function HistoryItem({ item }) {
  const mult7d = item.baseline7d ? (item.views7d / item.baseline7d) : null
  const pct24h = item.baseline24h ? Math.min((item.views24h / item.baseline24h) * 50, 100) : 0
  const pct7d  = item.baseline7d  ? Math.min((item.views7d  / item.baseline7d)  * 50, 100) : 0
  const pct30d = item.baseline30d ? Math.min((item.views30d / item.baseline30d) * 50, 100) : 0
  const below = mult7d != null && mult7d < 1.0

  return (
    <div className="history-item">
      <div className="history-item-top">
        <div className="history-cover">
          {item.cover ? <img src={item.cover} alt="" style={{ width: 80, height: 80, objectFit: 'cover' }} /> : <Music2 size={28} strokeWidth={1.5} style={{ color: 'var(--muted)' }} />}
        </div>
        <div className="history-body">
          <div className="history-title-text">{item.title}</div>
          <div className="history-artist-text">{item.artist}</div>
          <div className="history-date">{formatDate(item.postedAt)}</div>
        </div>
        {mult7d != null && (
          <div style={{ padding: '10px 14px 0 0', display: 'flex', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: !below ? 'var(--secondary)' : 'var(--primary)' }}>
              {mult7d.toFixed(1)}×
            </span>
          </div>
        )}
      </div>

      {item.views24h != null && (
        <div className="history-perf">
          <PerfBar label="24h" views={item.views24h} pct={pct24h} below={below} />
          <PerfBar label="7d"  views={item.views7d}  pct={pct7d}  below={below} />
          <PerfBar label="30d" views={item.views30d} pct={pct30d} below={below} />
        </div>
      )}
    </div>
  )
}

function PerfBar({ label, views, pct, below }) {
  return (
    <div className="perf-bar-wrap" style={{ marginBottom: 6 }}>
      <div className="perf-bar-label">
        <span>{label}</span>
        <span style={{ color: 'var(--light)', fontWeight: 600 }}>{fmtK(views)}</span>
      </div>
      <div className="perf-bar-track">
        <div className={`perf-bar-fill${below ? ' below' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function fmtK(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

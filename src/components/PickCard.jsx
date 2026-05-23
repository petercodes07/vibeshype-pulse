import { useState } from 'react'
import { Music2, Flame, TrendingUp, Trophy, FileText, SlidersHorizontal, Check, X, ChevronDown, ChevronUp } from 'lucide-react'

export default function PickCard({ pick, rank, onAction }) {
  const [expanded, setExpanded] = useState(false)
  const [acted, setActed] = useState(false)
  const [coverFailed, setCoverFailed] = useState(false)

  if (!pick || acted) return null

  function handleAction(action) {
    setActed(true)
    onAction?.(pick.id, action)
  }

  const showCover = pick.cover && !coverFailed

  return (
    <div className="pick-card" style={{ margin: '0 16px 8px' }}>

      {/* ── Collapsed row ── */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Cover */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          {showCover ? (
            <img
              src={pick.cover}
              alt={pick.title}
              onError={() => setCoverFailed(true)}
              style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              width: 52, height: 52, borderRadius: 8,
              background: coverGradient(pick.title),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Music2 size={18} strokeWidth={1.5} color="rgba(255,255,255,0.6)" />
            </div>
          )}
          {/* Rank badge */}
          <div style={{
            position: 'absolute', top: -6, left: -6,
            width: 18, height: 18, borderRadius: '50%',
            background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800, color: '#fff',
          }}>
            {rank}
          </div>
        </div>

        {/* Title + artist + chips */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: 14, lineHeight: 1.3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {pick.title}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1, marginBottom: 5 }}>
            {pick.artist}
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {pick.peerCount >= 2 && (
              <span className="signal-chip hot" style={{ fontSize: 10, padding: '3px 7px' }}>
                <Flame size={10} strokeWidth={2} /> {pick.peerCount} peers
              </span>
            )}
            {pick.viewsPerHour && (
              <span className="signal-chip green" style={{ fontSize: 10, padding: '3px 7px' }}>
                <TrendingUp size={10} strokeWidth={2} /> {fmtK(pick.viewsPerHour)}/hr
              </span>
            )}
            {pick.chartRank && (
              <span className="signal-chip gold" style={{ fontSize: 10, padding: '3px 7px' }}>
                <Trophy size={10} strokeWidth={2} /> #{pick.chartRank}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <div style={{ color: 'var(--gray)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* ── Expanded details ── */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 12px 14px' }}>

          {/* Reason */}
          <div className="pick-reason" style={{ marginBottom: 10 }}>
            <div className="pick-reason-label">Why post this today</div>
            <div className="pick-reason-text">{pick.reason}</div>
          </div>

          {/* All chips */}
          <div className="pick-signals" style={{ marginBottom: 12 }}>
            {pick.peerCount >= 2 && (
              <span className="signal-chip hot"><Flame size={12} strokeWidth={2} /> {pick.peerCount} peers</span>
            )}
            {pick.viewsPerHour && (
              <span className="signal-chip green"><TrendingUp size={12} strokeWidth={2} /> {fmtK(pick.viewsPerHour)}/hr</span>
            )}
            {pick.chartRank && (
              <span className="signal-chip gold"><Trophy size={12} strokeWidth={2} /> Chart #{pick.chartRank}</span>
            )}
            {pick.lyricsAvailable && (
              <span className="signal-chip blue"><FileText size={12} strokeWidth={2} /> Lyrics ready</span>
            )}
            {pick.variant && pick.variant !== 'original' && (
              <span className="signal-chip"><SlidersHorizontal size={12} strokeWidth={2} /> {pick.variant}</span>
            )}
          </div>

          {/* Actions */}
          <div className="pick-actions">
            <button className="btn-post" onClick={() => handleAction('posted')}>
              <Check size={14} strokeWidth={2.5} /> Post it
            </button>
            <button className="btn-skip" onClick={() => handleAction('skipped')}>Skip</button>
            <button className="btn-dismiss" onClick={() => handleAction('dismissed')}>
              <X size={14} strokeWidth={2.5} /> Nope
            </button>
          </div>

          {/* Sources */}
          {pick.sources?.length > 0 && (
            <div className="pick-sources" style={{ marginTop: 12, padding: '10px 0 0', borderTop: '1px solid var(--border)' }}>
              <div className="source-label">Peer channels posting this</div>
              {pick.sources.map((s, i) => (
                <div key={i} className="source-item">
                  <div className="source-avatar">
                    {s.avatar ? <img src={s.avatar} alt="" /> : (s.name?.[0] ?? '?')}
                  </div>
                  <span className="source-name">{s.name}</span>
                  <span className="source-views">{fmtK(s.views)} views</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function fmtK(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const GRADIENTS = [
  ['#1a1a2e', '#16213e'],
  ['#2d1b69', '#11998e'],
  ['#1a0533', '#6a0572'],
  ['#0f3460', '#533483'],
  ['#16213e', '#e94560'],
  ['#1b1b2f', '#e43f5a'],
  ['#162447', '#1f4068'],
  ['#2c003e', '#5c0099'],
]

function coverGradient(title = '') {
  const i = [...title].reduce((acc, c) => acc + c.charCodeAt(0), 0) % GRADIENTS.length
  const [a, b] = GRADIENTS[i]
  return `linear-gradient(135deg, ${a}, ${b})`
}

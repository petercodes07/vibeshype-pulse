import { useState } from 'react'
import { Music2, Flame, TrendingUp, Trophy, FileText, SlidersHorizontal, Check, X, ChevronDown, ChevronUp, Copy, BookOpen, Globe, Play } from 'lucide-react'
import { saveEntry } from '../utils/journal'
import VideoModal from './VideoModal'

const VARIANTS = ['original', 'slowed', 'sped-up', 'lyrics']

export default function PickCard({ pick, rank, onAction, opportunityBadge }) {
  const [expanded,   setExpanded]   = useState(false)
  const [step,       setStep]       = useState('idle')  // 'idle' | 'journal' | 'done'
  const [acted,      setActed]      = useState(false)
  const [coverFailed, setCoverFailed] = useState(false)
  const [copied,     setCopied]     = useState(false)
  const [videoOpen,  setVideoOpen]  = useState(false)
  // journal state
  const [note,       setNote]       = useState('')
  const [variant,    setVariant]    = useState(pick?.variant ?? 'original')

  function handleCopy(e) {
    e.stopPropagation()
    const text = pick.artist ? `${pick.title} - ${pick.artist}` : pick.title
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!pick || acted) return null

  function handleAction(action) {
    if (action === 'posted') {
      // Open journal editor before dismissing
      setStep('journal')
      setExpanded(true)
    } else {
      setActed(true)
      onAction?.(pick.id, action)
    }
  }

  function submitJournal(skip = false) {
    if (!skip) saveEntry(pick.id, note, variant)
    onAction?.(pick.id, 'posted')
    setActed(true)
  }

  const showCover = pick.cover && !coverFailed

  return (
    <>
    {videoOpen && (
      <VideoModal
        videoId={pick.id}
        title={pick.title}
        onClose={() => setVideoOpen(false)}
      />
    )}
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

        {/* Play + Copy + Chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {/* Play button — only shown when pick.id is a real YouTube video ID */}
          {pick.id && !pick.id.startsWith('mock') && (
            <button
              onClick={e => { e.stopPropagation(); setVideoOpen(true) }}
              title="Preview on YouTube"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--primary)',
                color: '#fff', flexShrink: 0,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              <Play size={11} strokeWidth={2.5} style={{ marginLeft: 1 }} />
            </button>
          )}
          <button
            onClick={handleCopy}
            title="Copy song title"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 6,
              background: copied ? 'rgba(29,185,84,0.15)' : 'var(--surface2)',
              color: copied ? 'var(--secondary)' : 'var(--gray)',
              fontSize: 11, fontWeight: 700,
              transition: 'all 0.15s',
            }}
          >
            {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={2} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <div style={{ color: 'var(--gray)' }}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
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
            {opportunityBadge && (
              <span className="signal-chip" style={{ background: 'rgba(160,80,255,0.15)', color: '#c084fc' }}>
                <Globe size={12} strokeWidth={2} /> {opportunityBadge}
              </span>
            )}
          </div>

          {/* Actions / Journal editor */}
          {step === 'journal' ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <BookOpen size={11} strokeWidth={2} /> Quick journal
              </div>
              {/* Variant chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {VARIANTS.map(v => (
                  <button
                    key={v}
                    onClick={() => setVariant(v)}
                    style={{
                      padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                      background: variant === v ? 'rgba(29,185,84,0.18)' : 'var(--surface2)',
                      color: variant === v ? 'var(--secondary)' : 'var(--gray)',
                      border: `1.5px solid ${variant === v ? 'var(--secondary)' : 'transparent'}`,
                      transition: 'all 0.12s',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {/* Note textarea */}
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a note… (optional)"
                rows={2}
                style={{
                  width: '100%', background: 'var(--surface2)',
                  border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  color: 'var(--light)', fontSize: 13, fontFamily: 'inherit',
                  padding: '9px 12px', resize: 'none', outline: 'none',
                  lineHeight: 1.5, marginBottom: 10,
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--secondary)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-post"
                  style={{ flex: 1, background: 'var(--secondary)' }}
                  onClick={() => submitJournal(false)}
                >
                  <Check size={14} strokeWidth={2.5} /> Save & post
                </button>
                <button
                  className="btn-skip"
                  style={{ flex: '0 0 auto', padding: '13px 16px', fontSize: 12 }}
                  onClick={() => submitJournal(true)}
                >
                  Skip
                </button>
              </div>
            </div>
          ) : (
            <div className="pick-actions">
              <button className="btn-post" onClick={() => handleAction('posted')}>
                <Check size={14} strokeWidth={2.5} /> Post it
              </button>
              <button className="btn-skip" onClick={() => handleAction('skipped')}>Skip</button>
              <button className="btn-dismiss" onClick={() => handleAction('dismissed')}>
                <X size={14} strokeWidth={2.5} /> Nope
              </button>
            </div>
          )}

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
    </>
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

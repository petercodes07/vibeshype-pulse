import { useState } from 'react'

export default function PickCard({ pick, rank, onAction }) {
  const [expanded, setExpanded] = useState(false)
  const [acted, setActed] = useState(false)

  if (acted) return null

  function handleAction(action) {
    setActed(true)
    onAction?.(pick.id, action)
  }

  return (
    <div className="pick-card">
      <div className="pick-cover-wrap">
        {pick.cover ? (
          <img className="pick-cover" src={pick.cover} alt={pick.title} />
        ) : (
          <div className="pick-cover-placeholder">🎵</div>
        )}
        <span className="pick-rank">#{rank}</span>
      </div>

      <div className="pick-body">
        <div className="pick-title">{pick.title}</div>
        <div className="pick-artist">{pick.artist}</div>

        <div className="pick-reason">
          <div className="pick-reason-label">Why post this today</div>
          <div className="pick-reason-text">{pick.reason}</div>
        </div>

        <div className="pick-signals">
          {pick.peerCount >= 2 && (
            <span className="signal-chip hot">🔥 {pick.peerCount} peers</span>
          )}
          {pick.viewsPerHour && (
            <span className="signal-chip green">📈 {fmtK(pick.viewsPerHour)}/hr</span>
          )}
          {pick.chartRank && (
            <span className="signal-chip gold">🏆 Chart #{pick.chartRank}</span>
          )}
          {pick.lyricsAvailable && (
            <span className="signal-chip blue">📝 Lyrics ready</span>
          )}
          {pick.variant && pick.variant !== 'original' && (
            <span className="signal-chip">🎚 {pick.variant}</span>
          )}
        </div>

        <div className="pick-actions">
          <button className="btn-post" onClick={() => handleAction('posted')}>✓ Post it</button>
          <button className="btn-skip" onClick={() => handleAction('skipped')}>→ Skip</button>
          <button className="btn-dismiss" onClick={() => handleAction('dismissed')}>✕ Nope</button>
        </div>
      </div>

      {pick.sources?.length > 0 && (
        <>
          <button className="pick-expand-btn" onClick={() => setExpanded(e => !e)}>
            {expanded ? '▲ Hide sources' : `▾ See ${pick.sources.length} peer source${pick.sources.length > 1 ? 's' : ''}`}
          </button>
          {expanded && (
            <div className="pick-sources">
              <div className="source-label">Peer channels posting this</div>
              {pick.sources.map((s, i) => (
                <div key={i} className="source-item">
                  <div className="source-avatar">
                    {s.avatar ? <img src={s.avatar} alt="" /> : s.name[0]}
                  </div>
                  <span className="source-name">{s.name}</span>
                  <span className="source-views">{fmtK(s.views)} views</span>
                </div>
              ))}
            </div>
          )}
        </>
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

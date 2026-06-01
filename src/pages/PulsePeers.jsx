import { useState, useEffect } from 'react'
import { pulse } from '../api'
import { Tv, X } from 'lucide-react'
import { useActiveChannel } from '../context/ActiveChannelContext'

const MOCK_PEERS = [
  { channelId: 'UC001', name: 'SoundWave Lyrics', subs: '2.3M', similarity: 0.94, source: 'ai' },
  { channelId: 'UC002', name: 'MusicBox Arabic', subs: '1.8M', similarity: 0.91, source: 'ai' },
  { channelId: 'UC003', name: 'TopHitsLyrics', subs: '950K', similarity: 0.88, source: 'ai' },
  { channelId: 'UC004', name: 'HitSongLyrics', subs: '780K', similarity: 0.85, source: 'ai' },
  { channelId: 'UC005', name: 'ViralLyric', subs: '640K', similarity: 0.82, source: 'manual' },
]

export default function PulsePeers() {
  const { activeChannel } = useActiveChannel()
  const [peers, setPeers] = useState(null)
  const [adding, setAdding] = useState(false)
  const [newUrl, setNewUrl] = useState('')

  useEffect(() => {
    setPeers(null)
    pulse.peers()
      .then(data => setPeers(data.peers ?? []))
      .catch(() => setPeers(MOCK_PEERS))
  }, [activeChannel?.channelId])

  function handleRemove(id) {
    setPeers(prev => prev.filter(p => p.channelId !== id))
    pulse.savePeers((peers ?? []).filter(p => p.channelId !== id).map(p => p.channelId)).catch(() => {})
  }

  function handleAdd() {
    if (!newUrl.trim()) return
    setAdding(false)
    setNewUrl('')
    // optimistic add — backend resolves channel name
    const stub = { channelId: `manual_${Date.now()}`, name: newUrl, subs: '—', similarity: null, source: 'manual' }
    setPeers(prev => [...(prev ?? []), stub])
    pulse.savePeers([...(peers ?? []).map(p => p.channelId), newUrl]).catch(() => {})
  }

  const aiPeers = (peers ?? []).filter(p => p.source === 'ai')
  const manualPeers = (peers ?? []).filter(p => p.source === 'manual')

  return (
    <div className="screen">
      <div className="section-header">
        <div className="section-title">Peer Channels</div>
        <div className="section-sub">
          Songs trending here surface in your daily picks. Keep this list tight — quality over quantity.
        </div>
      </div>

      {peers === null ? (
        <div className="loading-screen" style={{ height: 300 }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {aiPeers.length > 0 && (
            <>
              <div className="section-label">AI-matched ({aiPeers.length})</div>
              {aiPeers.map(p => (
                <PeerRow key={p.channelId} peer={p} onRemove={handleRemove} />
              ))}
            </>
          )}

          {manualPeers.length > 0 && (
            <>
              <div className="section-label">Added by you ({manualPeers.length})</div>
              {manualPeers.map(p => (
                <PeerRow key={p.channelId} peer={p} onRemove={handleRemove} />
              ))}
            </>
          )}

          {adding ? (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <div className="input-wrap" style={{ marginBottom: 10 }}>
                <input
                  type="url"
                  placeholder="https://youtube.com/@channelname"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  autoFocus
                />
                <span className="input-icon"><Tv size={15} strokeWidth={1.75} /></span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  style={{ flex: 2, padding: '12px', background: 'var(--primary)', color: '#fff', borderRadius: 'var(--radius-sm)', fontWeight: 700, fontSize: 14 }}
                  onClick={handleAdd}
                >
                  Add peer
                </button>
                <button
                  style={{ flex: 1, padding: '12px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', fontWeight: 600, fontSize: 14 }}
                  onClick={() => { setAdding(false); setNewUrl('') }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '14px 16px', borderTop: '1px solid var(--border)', color: 'var(--primary)', fontWeight: 600, fontSize: 14 }}
              onClick={() => setAdding(true)}
            >
              <span style={{ fontSize: 20 }}>＋</span> Add a channel
            </button>
          )}

          <div style={{ margin: '20px 16px', padding: 14, background: 'var(--surface2)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 12, color: 'var(--gray)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--muted)' }}>How peers work:</strong> We watch every video these channels post. When 2+ of them post the same song within 72 hours, it enters your candidate pool — that's the cross-channel signal that makes recommendations reliable.
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PeerRow({ peer, onRemove }) {
  return (
    <div className="peer-manage-item">
      <div className="peer-avatar" style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, fontSize: 16 }}>
        {peer.avatar ? <img src={peer.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : peer.name[0]}
      </div>
      <div className="peer-manage-info">
        <div className="peer-manage-name">{peer.name}</div>
        <div className="peer-manage-meta">
          {peer.subs} subs
          {peer.similarity != null && ` · ${Math.round(peer.similarity * 100)}% match`}
        </div>
      </div>
      <button className="peer-remove-btn" onClick={() => onRemove(peer.channelId)} title="Remove"><X size={14} strokeWidth={2} /></button>
    </div>
  )
}

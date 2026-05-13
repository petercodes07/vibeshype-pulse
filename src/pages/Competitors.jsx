/**
 * Competitors — Results page
 *
 * Receives { channel, competitors } from ConnectChannel navigation state.
 * Also supports loading results for a known channelId via query param:
 *   /competitors?channelId=UCxxxxxxx
 */

import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Users, ExternalLink } from 'lucide-react'

export default function Competitors() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [channel, setChannel] = useState(location.state?.channel ?? null)
  const [competitors, setCompetitors] = useState(location.state?.competitors ?? null)
  const [loading, setLoading] = useState(!location.state)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (location.state) return // already have data from navigation
    const channelId = searchParams.get('channelId')
    if (!channelId) { setError('No channel specified.'); setLoading(false); return }

    fetch(`/api/competitors?channelId=${encodeURIComponent(channelId)}`)
      .then(r => r.json())
      .then(data => {
        setChannel(data.channel)
        setCompetitors(data.competitors ?? [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="screen-bare">
        <div className="loading-screen" style={{ height: '100vh' }}>
          <div className="spinner" />
          Loading results…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="screen-bare" style={{ padding: 24, textAlign: 'center', color: '#ff7070' }}>
        {error}
      </div>
    )
  }

  return (
    <div className="screen" style={{ paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 0' }}>
        <button
          onClick={() => navigate('/connect')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gray)', fontSize: 13, marginBottom: 16 }}
        >
          <ArrowLeft size={14} /> Try another channel
        </button>

        {channel && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            {channel.thumbnail_url && (
              <img
                src={channel.thumbnail_url}
                alt=""
                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{channel.name}</div>
              {channel.handle && (
                <div style={{ fontSize: 12, color: 'var(--gray)' }}>{channel.handle}</div>
              )}
            </div>
          </div>
        )}

        <div className="section-title" style={{ marginBottom: 4 }}>
          Top {competitors?.length ?? 0} Competitors
        </div>
        <div className="section-sub">
          Ranked by content + audience similarity. AI-generated explanations below each.
        </div>
      </div>

      {/* Results */}
      {!competitors?.length ? (
        <div style={{ margin: '40px 20px', textAlign: 'center', color: 'var(--gray)' }}>
          <Users size={40} strokeWidth={1.25} style={{ marginBottom: 12, opacity: 0.5 }} />
          <div style={{ fontWeight: 700, color: 'var(--light)', marginBottom: 6 }}>No competitors found yet</div>
          <div style={{ fontSize: 13 }}>
            We need more indexed channels to compare against. Try connecting more channels first.
          </div>
        </div>
      ) : (
        <div style={{ padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {competitors.map((c, i) => (
            <CompetitorCard key={c.id} competitor={c} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function CompetitorCard({ competitor: c, rank }) {
  const pct = Math.round(c.score * 100)

  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Rank */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--surface2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: 'var(--muted)', flexShrink: 0,
        }}>
          {rank}
        </div>

        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'var(--surface2)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 16, overflow: 'hidden',
        }}>
          {c.thumbnail_url
            ? <img src={c.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : c.name[0]}
        </div>

        {/* Name + subs */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {c.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 1 }}>
            {c.subscriber_count ? fmtK(c.subscriber_count) + ' subs' : ''}
            {c.country ? ` · ${c.country}` : ''}
          </div>
        </div>

        {/* Open on YouTube */}
        <a
          href={`https://youtube.com/channel/${c.id}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: 'var(--gray)', flexShrink: 0 }}
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Match score bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--gray)', marginBottom: 4 }}>
          <span>Match score</span>
          <span style={{ fontWeight: 700, color: 'var(--secondary)' }}>{pct}%</span>
        </div>
        <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
            borderRadius: 2,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* AI reason */}
      {c.reason && (
        <div style={{
          fontSize: 13, color: 'var(--muted)', lineHeight: 1.5,
          padding: '8px 12px',
          background: 'var(--surface2)',
          borderRadius: 'var(--radius-sm)',
          borderLeft: '2px solid var(--primary)',
        }}>
          {c.reason}
        </div>
      )}
    </div>
  )
}

function fmtK(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

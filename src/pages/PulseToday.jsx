import { useState, useEffect, useRef, useCallback } from 'react'
import PickCard from '../components/PickCard'
import { pulse } from '../api'
import { RefreshCw, Globe } from 'lucide-react'
import { useActiveChannel } from '../context/ActiveChannelContext'

export default function PulseToday() {
  const { activeChannel } = useActiveChannel()
  const [picks,        setPicks]        = useState(null)
  const [opps,         setOpps]         = useState(null)   // opportunities
  const [refreshing,   setRefreshing]   = useState(false)
  const pollRef = useRef(null)

  const loadPicks = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const data = await pulse.today()
      const p = data.picks ?? []
      setPicks(p)
      if (p.length > 0 && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    } catch {
      // keep whatever was shown before on error
    } finally {
      if (showSpinner) setRefreshing(false)
    }
  }, [])

  const loadOpps = useCallback(async () => {
    try {
      const data = await pulse.opportunities()
      setOpps(data.opportunities ?? [])
    } catch {
      setOpps([])
    }
  }, [])

  useEffect(() => {
    setPicks(null)
    setOpps(null)
    loadPicks()
    loadOpps()
    // poll every 60s while picks are empty
    pollRef.current = setInterval(() => loadPicks(), 60_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [loadPicks, loadOpps, activeChannel?.channelId])

  function handleAction(id, action) {
    pulse.act(id, action).catch(() => {})
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const displayPicks = picks ?? []

  return (
    <div className="screen">
      {/* ── Header ── */}
      <div className="today-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="today-date">{today}</div>
            <div className="today-title">Today's Picks</div>
          </div>
          <button
            onClick={() => { loadPicks(true); loadOpps() }}
            disabled={refreshing || picks === null}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 8, opacity: refreshing ? 0.4 : 1 }}
            title="Refresh picks"
          >
            <RefreshCw size={16} strokeWidth={1.75} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
        <div className="today-sub">
          {picks === null
            ? 'Loading your picks…'
            : displayPicks.length === 0
            ? 'Generating your picks — checking back every minute…'
            : `${displayPicks.length} song${displayPicks.length > 1 ? 's' : ''} trending in your niche`}
        </div>
      </div>

      {/* ── Main picks ── */}
      {picks === null ? (
        <div className="loading-screen" style={{ height: 300 }}>
          <div className="spinner" />
          Analysing your peer channels…
        </div>
      ) : displayPicks.length === 0 ? (
        <div className="picks-empty">
          <div className="picks-empty-icon">
            <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
          </div>
          <div className="picks-empty-title">Generating your picks…</div>
          <p className="text-muted">
            Hang tight — we're analysing your peer channels right now. This page refreshes automatically.
          </p>
          <button
            className="btn-primary"
            style={{ marginTop: 16, maxWidth: 220 }}
            onClick={() => loadPicks(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Checking…' : 'Check now'}
          </button>
        </div>
      ) : (
        displayPicks.map((pick, i) => (
          <PickCard key={pick.id} pick={pick} rank={i + 1} onAction={handleAction} />
        ))
      )}

      {/* ── Cross-language opportunities ── */}
      <OpportunitiesSection opps={opps} onAction={handleAction} />
    </div>
  )
}

function OpportunitiesSection({ opps, onAction }) {
  const [collapsed, setCollapsed] = useState(false)

  // Don't render while loading or when empty
  if (opps === null) return null
  if (opps.length === 0) return null

  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
      {/* Section header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', padding: '10px 20px',
          color: 'var(--light)', textAlign: 'left',
        }}
      >
        <Globe size={15} strokeWidth={1.75} style={{ color: '#c084fc', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            Cross-language opportunities
            <span style={{
              marginLeft: 8, fontSize: 10, fontWeight: 700,
              background: 'rgba(160,80,255,0.18)', color: '#c084fc',
              padding: '2px 7px', borderRadius: 100,
            }}>
              {opps.length}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 1 }}>
            Viral elsewhere — not yet posted in your niche
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--gray)', flexShrink: 0 }}>
          {collapsed ? '▼' : '▲'}
        </span>
      </button>

      {/* Cards */}
      {!collapsed && opps.map((opp, i) => {
        const badge = opp.opportunityLanguages?.length
          ? opp.opportunityLanguages.join(' & ')
          : 'Cross-language'
        return (
          <PickCard
            key={opp.id}
            pick={opp}
            rank={i + 1}
            onAction={onAction}
            opportunityBadge={badge}
          />
        )
      })}
    </div>
  )
}

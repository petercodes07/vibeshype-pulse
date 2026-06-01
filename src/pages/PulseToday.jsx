import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import PickCard from '../components/PickCard'
import { pulse } from '../api'
import { RefreshCw, Globe } from 'lucide-react'
import { useActiveChannel } from '../context/ActiveChannelContext'
import { useToast } from '../context/ToastContext'

// Action → toast copy
const ACTION_TOAST = {
  posted:    { msg: 'Pick saved to history 🎵',    type: 'success' },
  skipped:   { msg: 'Pick skipped',                type: 'info'    },
  dismissed: { msg: 'Pick dismissed',              type: 'info'    },
}

export default function PulseToday() {
  const { activeChannel }       = useActiveChannel()
  const showToast               = useToast()
  const [picks,      setPicks]  = useState(null)   // null = loading
  const [error,      setError]  = useState(false)  // first-load hard failure
  const [opps,       setOpps]   = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [pollTick,   setPollTick]   = useState(0)  // G: increments every poll cycle
  const pollRef  = useRef(null)

  // H: date string stable across renders (recomputed only when day changes)
  const today = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [new Date().toDateString()],
  )

  const loadPicks = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const data = await pulse.today()
      const p = data.picks ?? []
      setPicks(p)
      setError(false)
      // D: only stop polling when picks are present AND not all dismissed
      // (caller decides to restart poll if they action everything — see handleAction)
      if (p.length > 0 && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    } catch {
      // C: surface a real error state on first load (picks === null)
      setPicks(prev => {
        if (prev === null) setError(true)
        return prev   // keep existing picks if a background refresh fails
      })
    } finally {
      if (showSpinner) setRefreshing(false)
      // G: bump tick so header pulse dot animates on every poll attempt
      setPollTick(n => n + 1)
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

  // Reset + reload when channel switches
  useEffect(() => {
    setPicks(null)
    setOpps(null)
    setError(false)
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }

    loadPicks()
    loadOpps()

    // Poll every 60s while waiting for picks
    pollRef.current = setInterval(() => loadPicks(), 60_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [loadPicks, loadOpps, activeChannel?.channelId])

  // D: if user actions the last visible pick, restart the poll so the page
  //    self-recovers once the server produces new ones
  function handleAction(id, action) {
    pulse.act(id, action).catch(() => {})

    // Toast feedback (E)
    const t = ACTION_TOAST[action]
    if (t) showToast(t.msg, t.type)

    // D: after dismissing all picks, restart polling
    const remaining = (picks ?? []).filter(p => p.id !== id)
    if (remaining.length === 0 && !pollRef.current) {
      pollRef.current = setInterval(() => loadPicks(), 60_000)
    }
  }

  const displayPicks = picks ?? []

  // F: unified subtitle — one clear message per state
  const subtitle = (() => {
    if (error)             return 'Could not load picks — tap refresh to retry.'
    if (picks === null)    return 'Analysing your peer channels…'
    if (!displayPicks.length) return 'No picks yet — checking back every minute…'
    return `${displayPicks.length} song${displayPicks.length > 1 ? 's' : ''} trending in your niche`
  })()

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
            disabled={refreshing}
            style={{
              background: 'none', border: 'none',
              color: error ? 'var(--primary)' : 'var(--muted)',
              cursor: 'pointer', padding: 8,
              opacity: refreshing ? 0.4 : 1,
            }}
            title="Refresh picks"
          >
            <RefreshCw size={16} strokeWidth={1.75} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="today-sub" style={{ margin: 0, color: error ? 'var(--primary)' : undefined }}>
            {subtitle}
          </div>
          {/* G: live poll activity dot — pulses on every tick while polling */}
          {picks !== null && !error && displayPicks.length === 0 && (
            <span
              key={pollTick}
              title="Checking for new picks…"
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--secondary)',
                display: 'inline-block', flexShrink: 0,
                animation: 'pulse-dot 1.2s ease-in-out',
              }}
            />
          )}
        </div>
      </div>

      {/* ── Main picks ── */}
      {picks === null && !error ? (
        /* C: initial load spinner */
        <div className="loading-screen" style={{ height: 300 }}>
          <div className="spinner" />
        </div>
      ) : error ? (
        /* C: hard error state */
        <div className="picks-empty" style={{ marginTop: 48 }}>
          <div className="picks-empty-title" style={{ color: 'var(--primary)' }}>
            Couldn't load picks
          </div>
          <p className="text-muted" style={{ marginTop: 6 }}>
            Check your connection and try again.
          </p>
          <button
            className="btn-primary"
            style={{ marginTop: 16, maxWidth: 200 }}
            onClick={() => { setError(false); setPicks(null); loadPicks() }}
            disabled={refreshing}
          >
            {refreshing ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      ) : displayPicks.length === 0 ? (
        /* Waiting for server to generate picks */
        <div className="picks-empty">
          <div className="picks-empty-icon">
            <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
          </div>
          <div className="picks-empty-title">Picks on the way…</div>
          <p className="text-muted">
            We're scanning your peer channels. This page checks automatically every minute.
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

// ── Cross-language opportunities section ─────────────────────────────────────

function OpportunitiesSection({ opps, onAction }) {
  const [collapsed, setCollapsed] = useState(false)

  if (opps === null || opps.length === 0) return null

  return (
    <div style={{ marginTop: 8, marginBottom: 8 }}>
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

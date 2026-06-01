import { useState, useEffect, useCallback } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Music2, X, GripVertical } from 'lucide-react'
import { pulse } from '../api'
import {
  saveQueueItem, getQueueForWeek, removeQueueItem,
  getMondayOf, offsetDate, formatDayLabel, isToday, toIso,
} from '../utils/queue'

export default function PickQueue() {
  const [weekStart, setWeekStart] = useState(() => getMondayOf())
  const [weekData,  setWeekData]  = useState({})
  const [picks,     setPicks]     = useState(null)
  const [dragOver,  setDragOver]  = useState(null)   // isoDate being hovered

  const refresh = useCallback(() => {
    setWeekData(getQueueForWeek(weekStart))
  }, [weekStart])

  useEffect(() => { refresh() }, [refresh])

  // Load today's picks for the drawer
  useEffect(() => {
    pulse.today()
      .then(d => setPicks(d.picks ?? []))
      .catch(() => setPicks([]))
  }, [])

  function prevWeek() { setWeekStart(d => offsetDate(d, -7)) }
  function nextWeek() { setWeekStart(d => offsetDate(d, +7)) }
  function goToday()  { setWeekStart(getMondayOf()) }

  function onDrop(e, isoDate) {
    e.preventDefault()
    setDragOver(null)
    try {
      const pick = JSON.parse(e.dataTransfer.getData('pickJson'))
      saveQueueItem(isoDate, pick)
      refresh()
    } catch {}
  }

  function onDragOver(e, isoDate) {
    e.preventDefault()
    setDragOver(isoDate)
  }

  const days = Array.from({ length: 7 }, (_, i) => offsetDate(weekStart, i))

  const currentWeekStart = getMondayOf()
  const weekLabel = (() => {
    const end = offsetDate(weekStart, 6)
    const s = new Date(weekStart + 'T00:00:00')
    const f = new Date(end       + 'T00:00:00')
    const sm = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const fm = f.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${sm} – ${fm}`
  })()

  return (
    <div className="screen">
      {/* Header */}
      <div className="section-header" style={{ paddingBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarDays size={20} strokeWidth={1.75} style={{ color: 'var(--primary)' }} />
              Post Queue
            </div>
            <div className="section-sub">Drag picks onto days to schedule your posts.</div>
          </div>
        </div>

        {/* Week nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
          <button
            onClick={prevWeek}
            style={{ padding: '6px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', color: 'var(--gray)' }}
          >
            <ChevronLeft size={15} strokeWidth={2} />
          </button>
          <div style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'var(--light)' }}>
            {weekLabel}
          </div>
          <button
            onClick={nextWeek}
            style={{ padding: '6px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', color: 'var(--gray)' }}
          >
            <ChevronRight size={15} strokeWidth={2} />
          </button>
          {weekStart !== currentWeekStart && (
            <button
              onClick={goToday}
              style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', color: 'var(--primary)', fontSize: 11, fontWeight: 700 }}
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {days.map(isoDate => {
          const queuedPicks = weekData[isoDate] ?? []
          const today = isToday(isoDate)
          const over  = dragOver === isoDate

          return (
            <div key={isoDate}>
              {/* Day header */}
              <div style={{
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.7px', color: today ? 'var(--primary)' : 'var(--gray)',
                marginBottom: 5,
              }}>
                {formatDayLabel(isoDate)}
                {today && <span style={{ marginLeft: 6, fontSize: 9, background: 'var(--primary-dim)', color: 'var(--primary)', padding: '1px 5px', borderRadius: 100 }}>today</span>}
              </div>

              {/* Drop zone */}
              <div
                onDragOver={e => onDragOver(e, isoDate)}
                onDragLeave={() => setDragOver(null)}
                onDrop={e => onDrop(e, isoDate)}
                style={{
                  minHeight: queuedPicks.length ? 'auto' : 52,
                  border: `1.5px dashed ${over ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  background: over ? 'rgba(255,59,59,0.05)' : 'transparent',
                  transition: 'border-color 0.15s, background 0.15s',
                  padding: queuedPicks.length ? 6 : 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  alignItems: queuedPicks.length ? 'stretch' : 'center',
                  justifyContent: queuedPicks.length ? 'flex-start' : 'center',
                }}
              >
                {queuedPicks.length === 0 ? (
                  <div style={{ fontSize: 12, color: over ? 'var(--primary)' : 'var(--gray)', userSelect: 'none' }}>
                    Drop a pick here
                  </div>
                ) : (
                  queuedPicks.map(pick => (
                    <QueuedItem
                      key={pick.id}
                      pick={pick}
                      onRemove={() => { removeQueueItem(isoDate, pick.id); refresh() }}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pick drawer */}
      <PickDrawer picks={picks} />
    </div>
  )
}

/* ── Queued item card ─────────────────────────────────────────── */
function QueuedItem({ pick, onRemove }) {
  const [coverFailed, setCoverFailed] = useState(false)

  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('pickJson', JSON.stringify(pick))}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'grab',
      }}
    >
      <GripVertical size={13} strokeWidth={1.75} style={{ color: 'var(--gray)', flexShrink: 0 }} />
      {pick.cover && !coverFailed ? (
        <img
          src={pick.cover} alt=""
          onError={() => setCoverFailed(true)}
          style={{ width: 32, height: 32, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 32, height: 32, borderRadius: 5, background: 'var(--surface2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Music2 size={13} strokeWidth={1.5} color="var(--gray)" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {pick.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{pick.artist}</div>
      </div>
      <button
        onClick={onRemove}
        style={{ color: 'var(--gray)', padding: 4, flexShrink: 0, transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--gray)'}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  )
}

/* ── Pick drawer ─────────────────────────────────────────────── */
function PickDrawer({ picks }) {
  const [open, setOpen] = useState(true)

  if (!picks) return null

  return (
    <div style={{
      margin: '0 16px 24px',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      background: 'var(--surface)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '12px 14px',
          borderBottom: open ? '1px solid var(--border)' : 'none',
          color: 'var(--light)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          Today's Picks
          <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--gray)', fontWeight: 500 }}>
            — drag onto a day to schedule
          </span>
        </span>
        <span style={{ fontSize: 11, color: 'var(--gray)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {picks.length === 0 ? (
            <div style={{ padding: '14px', textAlign: 'center', color: 'var(--gray)', fontSize: 13 }}>
              No picks loaded yet — check Today's Picks first.
            </div>
          ) : (
            picks.map(pick => <DrawerChip key={pick.id} pick={pick} />)
          )}
        </div>
      )}
    </div>
  )
}

function DrawerChip({ pick }) {
  const [coverFailed, setCoverFailed] = useState(false)

  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('pickJson', JSON.stringify(pick))}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px',
        background: 'var(--surface2)',
        borderRadius: 'var(--radius-sm)',
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      <GripVertical size={13} strokeWidth={1.75} style={{ color: 'var(--gray)', flexShrink: 0 }} />
      {pick.cover && !coverFailed ? (
        <img
          src={pick.cover} alt=""
          onError={() => setCoverFailed(true)}
          style={{ width: 30, height: 30, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 30, height: 30, borderRadius: 4, background: 'var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Music2 size={12} strokeWidth={1.5} color="var(--gray)" />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {pick.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{pick.artist}</div>
      </div>
    </div>
  )
}

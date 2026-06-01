import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { House, Music2, Swords, BarChart2, UserCircle, Settings, Keyboard, CalendarDays, Search } from 'lucide-react'

const COMMANDS = [
  { id: 'nav-home',        label: 'Go to Home',            icon: House,         action: nav => nav('/pulse/home') },
  { id: 'nav-today',       label: "Go to Today's Picks",   icon: Music2,        action: nav => nav('/pulse/today') },
  { id: 'nav-competitors', label: 'Go to Competitors',     icon: Swords,        action: nav => nav('/pulse/competitors') },
  { id: 'nav-history',     label: 'Go to History',         icon: BarChart2,     action: nav => nav('/pulse/history') },
  { id: 'nav-queue',       label: 'Go to Post Queue',      icon: CalendarDays,  action: nav => nav('/pulse/queue') },
  { id: 'nav-profile',     label: 'Go to Profile',         icon: UserCircle,    action: nav => nav('/pulse/profile') },
  { id: 'nav-settings',    label: 'Open Settings',         icon: Settings,      action: nav => nav('/pulse/settings') },
  { id: 'shortcuts',       label: 'Show Keyboard Shortcuts', icon: Keyboard,    action: (_nav, cb) => cb() },
]

function fuzzy(query, text) {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  return qi === q.length
}

export default function CommandPalette({ onClose, onShowShortcuts }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const filtered = query.trim()
    ? COMMANDS.filter(c => fuzzy(query.trim(), c.label))
    : COMMANDS

  // Reset active index when filtered list changes
  useEffect(() => { setActiveIdx(0) }, [query])

  // Autofocus
  useEffect(() => { inputRef.current?.focus() }, [])

  const run = useCallback((cmd) => {
    onClose()
    if (cmd.id === 'shortcuts') {
      onShowShortcuts()
    } else {
      cmd.action(navigate, onShowShortcuts)
    }
  }, [navigate, onClose, onShowShortcuts])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[activeIdx]) run(filtered[activeIdx])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filtered, activeIdx, run, onClose])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIdx]
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 1000,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '14vh',
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: 480, maxWidth: '90vw',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          <Search size={15} strokeWidth={2} style={{ color: 'var(--gray)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command…"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--light)', fontSize: 15, fontFamily: 'inherit',
            }}
          />
          <kbd style={{
            fontSize: 10, color: 'var(--gray)',
            border: '1px solid var(--border)', borderRadius: 4,
            padding: '2px 5px', fontFamily: 'inherit', flexShrink: 0,
          }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          style={{ maxHeight: 320, overflowY: 'auto', padding: '6px 6px' }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--gray)', fontSize: 13 }}>
              No commands match "{query}"
            </div>
          ) : (
            filtered.map((cmd, i) => {
              const Icon = cmd.icon
              const isActive = i === activeIdx
              return (
                <button
                  key={cmd.id}
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseDown={() => run(cmd)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: isActive ? 'var(--surface2)' : 'transparent',
                    color: isActive ? 'var(--light)' : 'var(--muted)',
                    fontSize: 14, fontWeight: 500,
                    transition: 'background 0.1s, color 0.1s',
                    textAlign: 'left',
                  }}
                >
                  <Icon size={15} strokeWidth={1.75} style={{ flexShrink: 0, color: isActive ? 'var(--primary)' : 'var(--gray)' }} />
                  {cmd.label}
                </button>
              )
            })
          )}
        </div>

        {/* Footer hint */}
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: 12,
          fontSize: 11, color: 'var(--gray)',
        }}>
          <span><kbd style={kbdStyle}>↑↓</kbd> navigate</span>
          <span><kbd style={kbdStyle}>↵</kbd> select</span>
          <span><kbd style={kbdStyle}>ESC</kbd> close</span>
        </div>
      </div>
    </div>
  )
}

const kbdStyle = {
  fontSize: 10, color: 'var(--gray)',
  border: '1px solid var(--border)', borderRadius: 4,
  padding: '1px 4px', fontFamily: 'inherit',
  marginRight: 4,
}

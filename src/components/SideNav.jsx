import { useEffect, useState, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { House, Music2, Swords, BarChart2, CalendarDays, UserCircle, Settings, Keyboard, ChevronDown, Tv } from 'lucide-react'
import { useActiveChannel } from '../context/ActiveChannelContext'

const NAV_ITEMS = [
  { to: '/pulse/home',        icon: House,        label: 'Home',        shortcut: '1'  },
  { to: '/pulse/today',       icon: Music2,       label: 'Today',       shortcut: '2'  },
  { to: '/pulse/competitors', icon: Swords,       label: 'Competitors', shortcut: '3'  },
  { to: '/pulse/history',     icon: BarChart2,    label: 'History',     shortcut: '4'  },
  { to: '/pulse/queue',       icon: CalendarDays, label: 'Queue',       shortcut: null },
]

const BOTTOM_ITEMS = [
  { to: '/pulse/profile',  icon: UserCircle, label: 'Profile',  shortcut: '5' },
  { to: '/pulse/settings', icon: Settings,   label: 'Settings', shortcut: ',' },
]

export default function SideNav({ onShowShortcuts }) {
  const [rivalsBadge, setRivalsBadge] = useState(0)
  const { activeChannel, channels, setActiveChannel } = useActiveChannel()
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    function read() {
      try {
        const n = parseInt(localStorage.getItem('pulse_rivals_badge') || '0', 10)
        setRivalsBadge(isNaN(n) ? 0 : n)
      } catch {}
    }
    read()
    window.addEventListener('focus', read)
    return () => window.removeEventListener('focus', read)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return
    function onDown(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [dropOpen])

  return (
    <nav className="side-nav">
      <div className="side-nav-brand">
        Vibe<span>Shype</span>
        <div className="side-nav-brand-sub">Pulse</div>
      </div>

      {/* Channel switcher — only shown when 2+ channels are connected */}
      {channels.length > 1 && (
        <div ref={dropRef} style={{ position: 'relative', margin: '0 0 12px' }}>
          <button
            onClick={() => setDropOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              background: dropOpen ? 'var(--surface)' : 'transparent',
              color: 'var(--light)',
              border: '1px solid var(--border)',
              transition: 'background 0.12s',
            }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: 'var(--surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, overflow: 'hidden',
            }}>
              {activeChannel?.thumbnail_url
                ? <img src={activeChannel.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Tv size={12} strokeWidth={1.75} style={{ color: 'var(--gray)' }} />
              }
            </div>
            <span style={{
              flex: 1, fontSize: 12, fontWeight: 600,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              textAlign: 'left',
            }}>
              {activeChannel?.channelName ?? 'Select channel'}
            </span>
            <ChevronDown size={13} strokeWidth={2} style={{ color: 'var(--gray)', flexShrink: 0, transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>

          {dropOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', overflow: 'hidden',
              zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              {channels.map(ch => (
                <button
                  key={ch.channelId}
                  onClick={() => { setActiveChannel(ch); setDropOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '9px 10px',
                    background: ch.channelId === activeChannel?.channelId ? 'var(--surface2)' : 'transparent',
                    color: ch.channelId === activeChannel?.channelId ? 'var(--primary)' : 'var(--muted)',
                    fontSize: 12, fontWeight: 600,
                    transition: 'background 0.1s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (ch.channelId !== activeChannel?.channelId) e.currentTarget.style.background = 'var(--surface2)' }}
                  onMouseLeave={e => { if (ch.channelId !== activeChannel?.channelId) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, overflow: 'hidden', fontSize: 10, fontWeight: 700,
                  }}>
                    {ch.thumbnail_url
                      ? <img src={ch.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (ch.channelName?.[0] ?? '?')
                    }
                  </div>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ch.channelName}
                  </span>
                  {ch.channelId === activeChannel?.channelId && (
                    <span style={{ fontSize: 9, color: 'var(--primary)', flexShrink: 0 }}>●</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main nav items */}
      <div className="side-nav-items">
        {NAV_ITEMS.map(({ to, icon: Icon, label, shortcut }) => {
          const hasBadge = label === 'Competitors' && rivalsBadge > 0
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `side-nav-item${isActive ? ' active' : ''}`}
              onClick={() => (label === 'Competitors' || label === 'Home') && setRivalsBadge(0)}
            >
              <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
                <Icon size={17} strokeWidth={1.75} />
                {hasBadge && <span className="side-nav-badge" />}
              </span>
              <span className="side-nav-label">{label}</span>
              <ShortcutBadge k={shortcut} />
            </NavLink>
          )
        })}
      </div>

      {/* Footer: profile, settings + shortcuts button */}
      <div className="side-nav-footer">
        {BOTTOM_ITEMS.map(({ to, icon: Icon, label, shortcut }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `side-nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={17} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            <span className="side-nav-label">{label}</span>
            <ShortcutBadge k={shortcut} />
          </NavLink>
        ))}

        {/* Keyboard shortcuts help button */}
        <button
          onClick={onShowShortcuts}
          className="side-nav-item"
          title="Keyboard shortcuts (?)"
          style={{ width: '100%', marginTop: 4 }}
        >
          <Keyboard size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} />
          <span className="side-nav-label">Shortcuts</span>
          <ShortcutBadge k="?" />
        </button>
      </div>
    </nav>
  )
}

// Tiny keyboard-key badge shown at the right edge of each nav item
function ShortcutBadge({ k }) {
  if (!k) return null
  return (
    <span style={{
      marginLeft: 'auto',
      flexShrink: 0,
      fontSize: 9, fontWeight: 700,
      fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
      color: 'var(--border)',
      background: 'transparent',
      border: '1px solid var(--border)',
      borderRadius: 4,
      padding: '1px 4px',
      lineHeight: 1.6,
      userSelect: 'none',
      letterSpacing: 0,
    }}>
      {k}
    </span>
  )
}

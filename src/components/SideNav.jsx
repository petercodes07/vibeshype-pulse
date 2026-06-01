import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { House, Music2, Swords, BarChart2, CalendarDays, UserCircle, Settings, Keyboard } from 'lucide-react'

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

  return (
    <nav className="side-nav">
      <div className="side-nav-brand">
        Vibe<span>Shype</span>
        <div className="side-nav-brand-sub">Pulse</div>
      </div>

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

import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { House, Music2, Swords, BarChart2, UserCircle, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { to: '/pulse/home',        icon: House,     label: 'Home'        },
  { to: '/pulse/today',       icon: Music2,    label: 'Today'       },
  { to: '/pulse/competitors', icon: Swords,    label: 'Competitors' },
  { to: '/pulse/history',     icon: BarChart2, label: 'History'     },
]

const BOTTOM_ITEMS = [
  { to: '/pulse/profile',  icon: UserCircle, label: 'Profile'  },
  { to: '/pulse/settings', icon: Settings,   label: 'Settings' },
]

export default function SideNav() {
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

      <div className="side-nav-items">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
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
            </NavLink>
          )
        })}
      </div>

      <div className="side-nav-footer">
        {BOTTOM_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `side-nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={17} strokeWidth={1.75} style={{ flexShrink: 0 }} />
            <span className="side-nav-label">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

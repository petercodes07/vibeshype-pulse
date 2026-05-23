import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Music2, Swords, BarChart2, UserCircle } from 'lucide-react'

const BASE_ITEMS = [
  { to: '/pulse/today',   icon: Music2,     label: 'Today'   },
  { to: '/pulse/rivals',  icon: Swords,     label: 'Rivals'  },
  { to: '/pulse/history', icon: BarChart2,  label: 'Results' },
  { to: '/pulse/profile', icon: UserCircle, label: 'Profile' },
]

export default function BottomNav() {
  const [rivalsBadge, setRivalsBadge] = useState(0)

  // Read badge count from localStorage on mount and whenever the tab regains focus
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
    <nav className="nav">
      {BASE_ITEMS.map(({ to, icon: Icon, label }) => {
        const hasBadge = label === 'Rivals' && rivalsBadge > 0
        return (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            onClick={() => {
              if (label === 'Rivals') setRivalsBadge(0)
            }}
          >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon className="nav-icon" size={20} strokeWidth={1.75} />
              {hasBadge && (
                <span style={{
                  position: 'absolute',
                  top: -3, right: -5,
                  width: 8, height: 8,
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  border: '1.5px solid var(--dark)',
                }} />
              )}
            </span>
            {label}
          </NavLink>
        )
      })}
    </nav>
  )
}

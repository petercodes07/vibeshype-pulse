import { NavLink } from 'react-router-dom'

const items = [
  { to: '/pulse/today',   icon: '🎵', label: 'Today'   },
  { to: '/pulse/peers',   icon: '👥', label: 'Peers'   },
  { to: '/pulse/history', icon: '📈', label: 'Results' },
]

export default function BottomNav() {
  return (
    <nav className="nav">
      {items.map(({ to, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">{icon}</span>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

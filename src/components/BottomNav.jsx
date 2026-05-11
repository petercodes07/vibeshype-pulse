import { NavLink } from 'react-router-dom'
import { Music2, Users, BarChart2 } from 'lucide-react'

const items = [
  { to: '/pulse/today',   icon: Music2,    label: 'Today'   },
  { to: '/pulse/peers',   icon: Users,     label: 'Peers'   },
  { to: '/pulse/history', icon: BarChart2, label: 'Results' },
]

export default function BottomNav() {
  return (
    <nav className="nav">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <Icon className="nav-icon" size={20} strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

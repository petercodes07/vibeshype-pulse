import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Bell, Trash2, LogOut, Info } from 'lucide-react'
import { storage } from '../storage'

export default function Settings() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [clearing, setClearing] = useState(false)
  const [cleared,  setCleared]  = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  function handleClearData() {
    setClearing(true)
    const keep = ['pulse_token']
    Object.keys(localStorage)
      .filter(k => k.startsWith('pulse_') && !keep.includes(k))
      .forEach(k => localStorage.removeItem(k))
    setTimeout(() => { setClearing(false); setCleared(true) }, 600)
  }

  return (
    <div className="screen">
      <div style={{ padding: '28px 24px 0' }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>
          Settings
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28, lineHeight: 1.5 }}>
          App preferences and account options.
        </div>
      </div>

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Notifications section */}
        <SectionLabel icon={<Bell size={13} />} label="Notifications" />
        <SettingRow
          title="Daily brief"
          description="Get today's picks delivered every morning at 7 am"
          control={<Toggle defaultOn />}
        />

        {/* Data section */}
        <SectionLabel icon={<Trash2 size={13} />} label="Data" />
        <SettingRow
          title="Clear local cache"
          description="Removes tracked rivals, seen activity, and draft data. Your account is untouched."
          control={
            <button
              onClick={handleClearData}
              disabled={clearing || cleared}
              style={{
                padding: '7px 14px',
                borderRadius: 'var(--radius-sm)',
                background: cleared ? 'var(--secondary-dim)' : 'var(--surface2)',
                color: cleared ? 'var(--secondary)' : 'var(--gray)',
                fontSize: 12, fontWeight: 700,
                whiteSpace: 'nowrap',
                opacity: clearing ? 0.5 : 1,
                transition: 'all 0.2s',
              }}
            >
              {cleared ? '✓ Cleared' : clearing ? 'Clearing…' : 'Clear'}
            </button>
          }
        />

        {/* About section */}
        <SectionLabel icon={<Info size={13} />} label="About" />
        <SettingRow
          title="VibeShype Pulse"
          description="Know what songs to post before everyone else does."
          control={
            <span style={{ fontSize: 11, color: 'var(--gray)', fontVariantNumeric: 'tabular-nums' }}>
              v1.0
            </span>
          }
        />

        {/* Logout */}
        <div style={{ marginTop: 16 }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,59,59,0.08)',
              color: '#ff7070',
              fontSize: 13, fontWeight: 700,
              width: '100%',
              transition: 'background 0.15s',
            }}
          >
            <LogOut size={15} strokeWidth={2} />
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ icon, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.8px', color: 'var(--gray)',
      marginTop: 8, marginBottom: 2,
    }}>
      {icon} {label}
    </div>
  )
}

function SettingRow({ title, description, control }) {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius)',
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45 }}>{description}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  )
}

function Toggle({ defaultOn = false }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <button
      onClick={() => setOn(v => !v)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: on ? 'var(--primary)' : 'var(--surface2)',
        position: 'relative', transition: 'background 0.2s',
        border: '1px solid var(--border)',
      }}
    >
      <span style={{
        position: 'absolute', top: 2,
        left: on ? 20 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: on ? '#fff' : 'var(--gray)',
        transition: 'left 0.2s',
      }} />
    </button>
  )
}

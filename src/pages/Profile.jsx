import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { auth } from '../api'
import { Mail, AtSign, LogOut, Check, X } from 'lucide-react'

function initials(user) {
  if (user?.username) return user.username[0].toUpperCase()
  if (user?.email) return user.email[0].toUpperCase()
  return '?'
}

export default function Profile() {
  const { user, logout } = useAuth()

  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameVal, setUsernameVal] = useState(user?.username ?? '')
  const [usernameError, setUsernameError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

  async function saveUsername() {
    setUsernameError(null)
    if (!USERNAME_RE.test(usernameVal)) {
      setUsernameError('3–20 chars, letters, numbers, underscores only.')
      return
    }
    setSaving(true)
    try {
      await auth.updateMe({ username: usernameVal })
      setEditingUsername(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setUsernameError(
        err.status === 409
          ? 'That username is already taken.'
          : 'Could not save. Try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  function cancelUsername() {
    setUsernameVal(user?.username ?? '')
    setUsernameError(null)
    setEditingUsername(false)
  }

  return (
    <div className="screen">

      {/* Avatar + name */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 24px 28px' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-1px',
          marginBottom: 14,
        }}>
          {initials(user)}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px' }}>
          {user?.username ?? user?.email?.split('@')[0] ?? 'Your account'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{user?.email}</div>
      </div>

      {/* Divider */}
      <div className="divider" style={{ margin: '0 16px' }} />

      {/* Account section */}
      <div style={{ padding: '20px 16px 0' }}>
        <div className="profile-section-label">Account</div>
      </div>

      {/* Username row */}
      <div style={{ padding: '4px 16px 0' }}>
        <div style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <AtSign size={15} strokeWidth={1.75} style={{ color: 'var(--gray)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Username</div>
              {editingUsername ? (
                <>
                  <input
                    value={usernameVal}
                    onChange={e => setUsernameVal(e.target.value.replace(/\s/g, ''))}
                    maxLength={20}
                    autoFocus
                    style={{
                      width: '100%', background: 'transparent', border: 'none', outline: 'none',
                      color: 'var(--light)', fontSize: 15, fontFamily: 'inherit',
                    }}
                  />
                  {usernameError && (
                    <div style={{ fontSize: 11, color: '#ff7070', marginTop: 4 }}>{usernameError}</div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 15, color: 'var(--light)' }}>
                  {user?.username ?? <span style={{ color: 'var(--gray)' }}>Not set</span>}
                  {saved && <span style={{ fontSize: 12, color: 'var(--secondary)', marginLeft: 8 }}>Saved ✓</span>}
                </div>
              )}
            </div>
            {editingUsername ? (
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={saveUsername}
                  disabled={saving}
                  style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--secondary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Check size={14} strokeWidth={2.5} />
                </button>
                <button
                  onClick={cancelUsername}
                  style={{ width: 32, height: 32, borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingUsername(true)}
                style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, flexShrink: 0 }}
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Email row */}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Mail size={15} strokeWidth={1.75} style={{ color: 'var(--gray)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Email</div>
            <div style={{ fontSize: 15, color: 'var(--light)' }}>{user?.email}</div>
          </div>
          {user?.emailVerified && (
            <span style={{ fontSize: 11, color: 'var(--secondary)', fontWeight: 600, background: 'rgba(29,185,84,0.12)', padding: '3px 8px', borderRadius: 100 }}>
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Sign out */}
      <div style={{ padding: '32px 16px 0' }}>
        <button
          onClick={logout}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <LogOut size={15} strokeWidth={1.75} />
          Sign out
        </button>
      </div>

    </div>
  )
}

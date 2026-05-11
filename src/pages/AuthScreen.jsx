import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthScreen() {
  const { login, signup } = useAuth()
  const [tab, setTab] = useState('login') // 'login' | 'signup'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function switchTab(t) {
    setTab(t)
    setError(null)
    setEmail('')
    setPassword('')
    setName('')
    setConfirm('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (tab === 'signup') {
      if (!name.trim()) return setError('Please enter your name.')
      if (password.length < 8) return setError('Password must be at least 8 characters.')
      if (password !== confirm) return setError('Passwords do not match.')
    }

    setLoading(true)
    try {
      if (tab === 'login') {
        await login(email, password)
      } else {
        await signup(email, password, name)
      }
    } catch {
      setError(tab === 'login'
        ? 'Incorrect email or password.'
        : 'Could not create account. That email may already be in use.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen-bare">
      <div className="onboard-screen">
        <div>
          <div className="onboard-logo">Vibe<span>Shype</span> Pulse</div>
          <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>
            Know what to post next. Every day.
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%' }}>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              background: 'var(--surface)',
              borderRadius: 'var(--radius-sm)',
              padding: 3,
              marginBottom: 24,
              border: '1px solid var(--border)',
            }}>
              {['login', 'signup'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => switchTab(t)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 'calc(var(--radius-sm) - 2px)',
                    background: tab === t ? 'var(--accent)' : 'transparent',
                    color: tab === t ? '#fff' : 'var(--muted)',
                    fontWeight: 700,
                    fontSize: 13,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {t === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              {tab === 'signup' && (
                <div className="input-wrap">
                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="name"
                    autoFocus
                  />
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4"/>
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    </svg>
                  </span>
                </div>
              )}

              <div className="input-wrap">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus={tab === 'login'}
                />
                <span className="input-icon">✉️</span>
              </div>

              <div className="input-wrap">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                />
                <span className="input-icon">🔒</span>
              </div>

              {tab === 'signup' && (
                <div className="input-wrap">
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
                    </svg>
                  </span>
                </div>
              )}

              {error && (
                <div style={{
                  padding: '10px 14px', marginBottom: 14,
                  background: 'rgba(255,59,59,0.12)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ff7070', fontSize: 13, lineHeight: 1.5,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={!email.trim() || !password.trim() || loading}
              >
                {loading
                  ? (tab === 'login' ? 'Logging in…' : 'Creating account…')
                  : (tab === 'login' ? 'Log in →' : 'Create account →')}
              </button>
            </form>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--gray)', fontSize: 12, paddingBottom: 8 }}>
          By continuing you agree to our Terms of Service.
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthScreen() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
    } catch {
      setError('Incorrect email or password. Check your vibeshype.com credentials.')
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
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.4px' }}>
              Log in to Pulse
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.6 }}>
              Use your <strong style={{ color: 'var(--light)' }}>vibeshype.com</strong> email and password.
            </div>

            <form onSubmit={handleLogin}>
              <div className="input-wrap">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                />
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m2 7 10 7 10-7"/>
                  </svg>
                </span>
              </div>

              <div className="input-wrap">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
              </div>

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
                {loading ? 'Logging in…' : 'Log in →'}
              </button>
            </form>

            <div style={{ height: 1, background: 'var(--border)', margin: '24px 0' }} />

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--gray)', marginBottom: 12 }}>
                Don't have a vibeshype account yet?
              </div>
              <a
                href="https://vibeshype.com/signup"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '11px 24px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14, fontWeight: 600, color: 'var(--light)',
                  transition: 'border-color 0.15s',
                }}
              >
                Create a free account →
              </a>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--gray)', fontSize: 12, paddingBottom: 8 }}>
          By continuing you agree to our Terms of Service.
        </div>
      </div>
    </div>
  )
}

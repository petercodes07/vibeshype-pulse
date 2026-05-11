import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AuthScreen() {
  const { login, register } = useAuth()
  const [tab, setTab] = useState('login') // 'login' | 'signup'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [emailOptIn, setEmailOptIn] = useState(false)
  const [error, setError] = useState(null)
  const [conflictEmail, setConflictEmail] = useState(false) // 409 state
  const [loading, setLoading] = useState(false)

  function switchTab(t) {
    setTab(t)
    setError(null)
    setConflictEmail(false)
    setEmail('')
    setPassword('')
    setConfirm('')
    setAcceptedTerms(false)
    setEmailOptIn(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setConflictEmail(false)

    if (tab === 'signup') {
      if (password.length < 8) return setError('Password must be at least 8 characters.')
      if (password !== confirm) return setError('Passwords do not match.')
      if (!acceptedTerms) return setError('Please accept the Terms of Service to continue.')
    }

    setLoading(true)
    try {
      if (tab === 'login') {
        await login(email, password)
      } else {
        await register(email, password, emailOptIn)
      }
    } catch (err) {
      if (tab === 'signup' && err.status === 409) {
        setConflictEmail(true)
      } else {
        setError(tab === 'login'
          ? 'Incorrect email or password.'
          : 'Could not create account. Please try again.')
      }
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
              <div className="input-wrap">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
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
                <>
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

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={e => setAcceptedTerms(e.target.checked)}
                      style={{ marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                      I agree to the{' '}
                      <span style={{ color: 'var(--light)', textDecoration: 'underline' }}>Terms of Service</span>
                      {' '}and{' '}
                      <span style={{ color: 'var(--light)', textDecoration: 'underline' }}>Privacy Policy</span>
                    </span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={emailOptIn}
                      onChange={e => setEmailOptIn(e.target.checked)}
                      style={{ marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                      Send me tips and product updates (optional)
                    </span>
                  </label>
                </>
              )}

              {/* 409 conflict banner */}
              {conflictEmail && (
                <div style={{
                  padding: '10px 14px', marginBottom: 14,
                  background: 'rgba(255,59,59,0.12)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ff7070', fontSize: 13, lineHeight: 1.5,
                }}>
                  An account with that email already exists.{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('login')}
                    style={{ color: 'var(--accent)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13 }}
                  >
                    Go to login →
                  </button>
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
          {tab === 'login' ? (
            <>Already have an account? Just log in above.</>
          ) : (
            <>Already have a VibeShype account? Use those credentials.</>
          )}
        </div>
      </div>
    </div>
  )
}

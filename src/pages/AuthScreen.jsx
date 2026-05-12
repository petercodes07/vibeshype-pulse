import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { auth } from '../api'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function AuthScreen() {
  const { login, register } = useAuth()
  const [tab, setTab] = useState('login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [emailOptIn, setEmailOptIn] = useState(false)
  const [error, setError] = useState(null)
  const [conflictEmail, setConflictEmail] = useState(false)
  const [loading, setLoading] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState(null)
  const [forgotSent, setForgotSent] = useState(false)

  function switchTab(t) {
    setTab(t)
    setError(null)
    setConflictEmail(false)
    setEmail('')
    setPassword('')
    setConfirm('')
    setAcceptedTerms(false)
    setEmailOptIn(false)
    setShowForgot(false)
    setForgotSent(false)
    setForgotError(null)
  }

  function openForgot() {
    setShowForgot(true)
    setForgotEmail(email)
    setForgotError(null)
    setForgotSent(false)
  }

  async function handleForgot(e) {
    e.preventDefault()
    setForgotError(null)
    setForgotLoading(true)
    try {
      await auth.forgotPassword(forgotEmail)
      setForgotSent(true)
    } catch (err) {
      if (err.name === 'AbortError' || !err.status) {
        setForgotError('Could not reach the server. Check your connection.')
      } else {
        setForgotError('Something went wrong. Please try again.')
      }
    } finally {
      setForgotLoading(false)
    }
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
      } else if (err.name === 'AbortError' || !err.status) {
        setError('Could not reach the server. Check your connection.')
      } else if (tab === 'login' && err.status === 401) {
        setError('Incorrect email or password.')
      } else if (tab === 'login') {
        setError('Login failed. Please try again.')
      } else {
        setError('Could not create account. Please try again.')
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

            {/* Inline forgot password view */}
            {showForgot && (
              <div style={{ marginBottom: 24 }}>
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 13, marginBottom: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  ← Back to login
                </button>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Reset your password</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.55 }}>
                  Enter your email and we'll send you a link to reset your password.
                </div>
                {forgotSent ? (
                  <div style={{
                    padding: '12px 16px',
                    background: 'rgba(29,185,84,0.12)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--secondary)',
                    fontSize: 13, lineHeight: 1.5,
                  }}>
                    Check your email for a reset link.
                  </div>
                ) : (
                  <form onSubmit={handleForgot}>
                    <div className="input-wrap">
                      <input
                        type="email"
                        placeholder="Email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        autoComplete="email"
                        autoFocus
                        required
                      />
                      <span className="input-icon"><Mail size={15} strokeWidth={1.75} /></span>
                    </div>
                    {forgotError && (
                      <div style={{
                        padding: '10px 14px', marginBottom: 14,
                        background: 'rgba(255,59,59,0.12)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#ff7070', fontSize: 13, lineHeight: 1.5,
                      }}>
                        {forgotError}
                      </div>
                    )}
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={!forgotEmail.trim() || forgotLoading}
                    >
                      {forgotLoading ? 'Sending…' : 'Send reset link →'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {!showForgot && (
              <form onSubmit={handleSubmit}>
                <div className="input-wrap">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                  />
                  <span className="input-icon"><Mail size={15} strokeWidth={1.75} /></span>
                </div>

                <div className="input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  />
                  <span className="input-icon" onClick={() => setShowPassword(v => !v)} style={{ cursor: 'pointer' }}>
                    {showPassword ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
                  </span>
                </div>

                {tab === 'login' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: -8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={openForgot}
                      style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {tab === 'signup' && (
                  <>
                    <div className="input-wrap">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        name="confirm-password"
                        placeholder="Confirm password"
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        autoComplete="new-password"
                      />
                      <span className="input-icon" onClick={() => setShowConfirm(v => !v)} style={{ cursor: 'pointer' }}>
                        {showConfirm ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
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
            )}
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

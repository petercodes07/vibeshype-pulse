import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { auth } from '../api'
import { Mail, Lock, Eye, EyeOff, User, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'

export default function AuthScreen() {
  const { login, completeLogin, register } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('login')

  // 2-step login challenge
  const [challengeEmail, setChallengeEmail] = useState(null)
  const [challengePassword, setChallengePassword] = useState(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState(null)
  const [codeLoading, setCodeLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
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
  const [forgotCode, setForgotCode] = useState('')
  const [forgotPassword, setForgotPassword] = useState('')
  const [forgotConfirm, setForgotConfirm] = useState('')
  const [forgotDone, setForgotDone] = useState(false)

  function switchTab(t) {
    setTab(t)
    setError(null); setConflictEmail(false)
    setEmail(''); setPassword(''); setConfirm(''); setName('')
    setAcceptedTerms(false)
    setShowForgot(false); setForgotSent(false); setForgotError(null)
    setForgotCode(''); setForgotPassword(''); setForgotConfirm(''); setForgotDone(false)
  }

  function openForgot() {
    setShowForgot(true)
    setForgotEmail(email)
    setForgotError(null); setForgotSent(false)
    setForgotCode(''); setForgotPassword(''); setForgotConfirm(''); setForgotDone(false)
  }

  async function handleForgot(e) {
    e.preventDefault()
    setForgotError(null); setForgotLoading(true)
    try {
      await auth.forgotPassword(forgotEmail)
      setForgotSent(true)
    } catch (err) {
      if (err.name === 'AbortError' || !err.status) setForgotError('Could not reach the server. Check your connection.')
      else setForgotError('Something went wrong. Please try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setForgotError(null)
    if (forgotPassword.length < 8) return setForgotError('Password must be at least 8 characters.')
    if (forgotPassword !== forgotConfirm) return setForgotError('Passwords do not match.')
    setForgotLoading(true)
    try {
      await auth.resetPassword(forgotEmail, forgotCode.trim(), forgotPassword)
      setForgotDone(true)
    } catch (err) {
      if (err.name === 'AbortError' || !err.status) setForgotError('Could not reach the server. Check your connection.')
      else if (err.status === 400 || err.status === 404) setForgotError('Incorrect or expired code. Try again.')
      else setForgotError('Something went wrong. Please try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null); setConflictEmail(false)

    if (tab === 'signup') {
      if (!name.trim()) return setError('Please enter your name.')
      if (password.length < 8) return setError('Password must be at least 8 characters.')
      if (password !== confirm) return setError('Passwords do not match.')
      if (!acceptedTerms) return setError('Please accept the Terms of Service to continue.')
    }

    setLoading(true)
    try {
      if (tab === 'login') {
        const data = await login(email, password)
        // Login is always two-step — server emailed a code.
        if (data?.challengeRequired) {
          setChallengeEmail(data.email ?? email)
          setChallengePassword(password)
        }
      } else {
        await register(email, password, name.trim())
        navigate(`/verify-email?email=${encodeURIComponent(email)}`)
      }
    } catch (err) {
      if (tab === 'login' && err.status === 403 && err.body?.verificationRequired) {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`)
      } else if (tab === 'signup' && err.status === 409) {
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

  async function handleResend() {
    if (!challengeEmail || !challengePassword) return
    setResendLoading(true)
    setResendSent(false)
    setCodeError(null)
    try {
      await login(challengeEmail, challengePassword)
      setResendSent(true)
      setCode('')
    } catch {
      setCodeError('Could not resend code. Please go back and try again.')
    } finally {
      setResendLoading(false)
    }
  }

  async function handleCode(e) {
    e.preventDefault()
    setCodeError(null); setCodeLoading(true)
    try {
      await completeLogin(challengeEmail, code.trim(), rememberMe)
    } catch (err) {
      if (err.status === 401) setCodeError('Incorrect code. Check your email and try again.')
      else if (err.status === 429) setCodeError('Too many attempts. Request a new login link.')
      else if (err.status === 400) setCodeError('Code expired or invalid. Go back and log in again.')
      else if (err.name === 'AbortError' || !err.status) setCodeError('Could not reach the server. Check your connection.')
      else setCodeError('Something went wrong. Please try again.')
    } finally {
      setCodeLoading(false)
    }
  }

  const Hero = (
    <aside className="auth-hero">
      <div className="auth-hero-brand">Vibe<span>Shype</span> Pulse</div>

      <div className="auth-hero-pitch">
        <div className="auth-hero-title">
          Know what to <em>post next</em>.<br />Every day.
        </div>
        <div className="auth-hero-sub">
          Pulse watches your niche, surfaces what's trending, and gives you a
          ready-to-post pick before your coffee goes cold.
        </div>
        <div className="auth-hero-bullets">
          <div className="auth-hero-bullet"><span className="auth-hero-bullet-dot" /> Daily AI-picked content ideas</div>
          <div className="auth-hero-bullet"><span className="auth-hero-bullet-dot" /> Tracks the peers you actually care about</div>
          <div className="auth-hero-bullet"><span className="auth-hero-bullet-dot" /> Learns from what works for you</div>
        </div>
      </div>

      <div className="auth-hero-foot">© VibeShype · Built for creators</div>
    </aside>
  )

  // ── Challenge (login code) view ──
  if (challengeEmail) {
    return (
      <div className="screen-bare">
        <div className="auth-shell">
          {Hero}
          <div className="auth-pane">
            <div className="auth-card">
              <div className="auth-card-brand">Vibe<span>Shype</span> Pulse</div>

              <button
                type="button"
                className="back-link"
                onClick={() => { setChallengeEmail(null); setCode(''); setCodeError(null) }}
              >
                <ArrowLeft size={14} /> Back to login
              </button>

              <div className="auth-card-eyebrow">Verify it's you</div>
              <div className="auth-card-title">Check your email</div>
              <div className="auth-card-sub">
                We sent a 6-digit code to{' '}
                <span style={{ color: 'var(--light)', fontWeight: 600 }}>{challengeEmail}</span>.
                Enter it below or click the link in the email.
              </div>

              <form onSubmit={handleCode}>
                <div className="input-wrap">
                  <input
                    className="code-input"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                    autoFocus
                  />
                </div>

                {codeError && <div className="auth-alert error">{codeError}</div>}
                {resendSent && (
                  <div className="auth-alert success">New code sent — check your inbox.</div>
                )}

                <button type="submit" className="btn-primary" disabled={code.length !== 6 || codeLoading}>
                  {codeLoading ? 'Verifying…' : <>Confirm <ArrowRight size={16} style={{ verticalAlign: -3, marginLeft: 4 }} /></>}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <span style={{ fontSize: 13, color: 'var(--gray)' }}>Didn't get it? </span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {resendLoading ? 'Sending…' : 'Resend code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Forgot password view ──
  if (showForgot) {
    return (
      <div className="screen-bare">
        <div className="auth-shell">
          {Hero}
          <div className="auth-pane">
            <div className="auth-card">
              <div className="auth-card-brand">Vibe<span>Shype</span> Pulse</div>

              <button type="button" className="back-link" onClick={() => setShowForgot(false)}>
                <ArrowLeft size={14} /> Back to login
              </button>

              <div className="auth-card-eyebrow">Password reset</div>
              <div className="auth-card-title">Reset your password</div>
              <div className="auth-card-sub">
                Enter your email and — if there's an account — we'll send a link to set a new password.
              </div>

              {forgotDone ? (
                <div className="auth-alert success">
                  ✓ Password updated. You can now log in with your new password.
                </div>
              ) : forgotSent ? (
                <form onSubmit={handleReset}>
                  <div className="auth-card-sub" style={{ marginBottom: 16 }}>
                    We sent a 6-digit code to <strong>{forgotEmail}</strong>. Enter it below along with your new password.
                  </div>
                  <div className="input-wrap">
                    <input
                      className="code-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="000000"
                      maxLength={6}
                      value={forgotCode}
                      onChange={e => setForgotCode(e.target.value.replace(/\D/g, ''))}
                      autoFocus
                    />
                  </div>
                  <div className="input-wrap">
                    <span className="input-icon left"><Lock size={15} strokeWidth={1.75} /></span>
                    <input
                      type="password"
                      placeholder="New password"
                      value={forgotPassword}
                      onChange={e => setForgotPassword(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="input-wrap">
                    <span className="input-icon left"><Lock size={15} strokeWidth={1.75} /></span>
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      value={forgotConfirm}
                      onChange={e => setForgotConfirm(e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  {forgotError && <div className="auth-alert error">{forgotError}</div>}
                  <button type="submit" className="btn-primary" disabled={forgotCode.length !== 6 || !forgotPassword || !forgotConfirm || forgotLoading}>
                    {forgotLoading ? 'Saving…' : <>Set new password <ArrowRight size={16} style={{ verticalAlign: -3, marginLeft: 4 }} /></>}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgot}>
                  <div className="input-wrap">
                    <span className="input-icon left"><Mail size={15} strokeWidth={1.75} /></span>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      autoComplete="email"
                      autoFocus
                      required
                    />
                  </div>
                  {forgotError && <div className="auth-alert error">{forgotError}</div>}
                  <button type="submit" className="btn-primary" disabled={!forgotEmail.trim() || forgotLoading}>
                    {forgotLoading ? 'Sending…' : <>Send code <ArrowRight size={16} style={{ verticalAlign: -3, marginLeft: 4 }} /></>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Main login / signup view ──
  return (
    <div className="screen-bare">
      <div className="auth-shell">
        {Hero}
        <div className="auth-pane">
          <div className="auth-card">
            <div className="auth-card-brand">Vibe<span>Shype</span> Pulse</div>

            <div className="auth-card-eyebrow">
              <Sparkles size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
              {tab === 'login' ? 'Welcome back' : 'Get started'}
            </div>
            <div className="auth-card-title">
              {tab === 'login' ? 'Log in to Pulse' : 'Create your account'}
            </div>
            <div className="auth-card-sub">
              {tab === 'login'
                ? "We'll email you a 6-digit code to sign in."
                : "Free to start. We'll verify your email next."}
            </div>

            <div className="auth-tabs" role="tablist">
              {['login', 'signup'].map(t => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  className={`auth-tab ${tab === t ? 'active' : ''}`}
                  onClick={() => switchTab(t)}
                >
                  {t === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              {tab === 'signup' && (
                <div className="input-wrap">
                  <span className="input-icon left"><User size={15} strokeWidth={1.75} /></span>
                  <input
                    type="text"
                    name="name"
                    placeholder="Your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    autoComplete="name"
                    maxLength={60}
                  />
                </div>
              )}

              <div className="input-wrap">
                <span className="input-icon left"><Mail size={15} strokeWidth={1.75} /></span>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus={tab === 'login'}
                />
              </div>

              <div className="input-wrap">
                <span className="input-icon left"><Lock size={15} strokeWidth={1.75} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="input-icon right"
                  onClick={() => setShowPassword(v => !v)}
                  style={{ cursor: 'pointer', pointerEvents: 'all', background: 'none', border: 'none', padding: 0 }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
                </button>
              </div>

              {tab === 'signup' && (
                <div className="input-wrap">
                  <span className="input-icon left"><Lock size={15} strokeWidth={1.75} /></span>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirm-password"
                    placeholder="Confirm password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="input-icon right"
                    onClick={() => setShowConfirm(v => !v)}
                    style={{ cursor: 'pointer', pointerEvents: 'all', background: 'none', border: 'none', padding: 0 }}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
                  </button>
                </div>
              )}

              {tab === 'login' && (
                <div className="auth-row">
                  <label className="auth-check">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <button type="button" onClick={openForgot} className="auth-link">
                    Forgot password?
                  </button>
                </div>
              )}

              {tab === 'signup' && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={e => setAcceptedTerms(e.target.checked)}
                    style={{ marginTop: 2, accentColor: 'var(--primary)', flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                    I agree to the{' '}
                    <span style={{ color: 'var(--light)', textDecoration: 'underline' }}>Terms of Service</span>
                    {' '}and{' '}
                    <span style={{ color: 'var(--light)', textDecoration: 'underline' }}>Privacy Policy</span>
                  </span>
                </label>
              )}

              {conflictEmail && (
                <div className="auth-alert error">
                  An account with that email already exists.{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('login')}
                    style={{ color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13 }}
                  >
                    Go to login →
                  </button>
                </div>
              )}

              {error && <div className="auth-alert error">{error}</div>}

              <button
                type="submit"
                className="btn-primary"
                disabled={!email.trim() || !password.trim() || loading}
              >
                {loading
                  ? (tab === 'login' ? 'Sending code…' : 'Creating account…')
                  : (
                    <>
                      {tab === 'login' ? 'Continue' : 'Create account'}
                      <ArrowRight size={16} style={{ verticalAlign: -3, marginLeft: 6 }} />
                    </>
                  )}
              </button>
            </form>

            <div className="auth-foot">
              {tab === 'login' ? (
                <>New to Pulse?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('signup')}
                    style={{ color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12 }}
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchTab('login')}
                    style={{ color: 'var(--primary)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 12 }}
                  >
                    Log in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

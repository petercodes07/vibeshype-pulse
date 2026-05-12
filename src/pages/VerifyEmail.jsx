import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { auth } from '../api'
import { Mail } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const status = searchParams.get('status')  // ok | already | expired | invalid | error | null
  const email  = searchParams.get('email')

  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const [resendError, setResendError] = useState(null)

  async function handleResend() {
    setResendError(null)
    setResendSent(false)
    setResendLoading(true)
    try {
      await auth.resendVerification(email)
      setResendSent(true)
    } catch (err) {
      setResendError(
        err.name === 'AbortError' || !err.status
          ? 'Could not reach the server. Check your connection.'
          : 'Something went wrong. Please try again.'
      )
    } finally {
      setResendLoading(false)
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

            {/* ── Success ── */}
            {(status === 'ok' || status === 'already') && (
              <>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.4px' }}>
                  {status === 'ok' ? 'Email verified!' : 'Already verified'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28, lineHeight: 1.65 }}>
                  {status === 'ok'
                    ? 'Your email has been confirmed. You can now log in.'
                    : 'This email was already verified. Go ahead and log in.'}
                </div>
                <button type="button" className="btn-primary" onClick={() => navigate('/')}>
                  Go to login →
                </button>
              </>
            )}

            {/* ── Failed token ── */}
            {(status === 'expired' || status === 'invalid' || status === 'error') && (
              <>
                <div style={{
                  padding: '12px 16px', marginBottom: 20,
                  background: 'rgba(255,59,59,0.12)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ff7070', fontSize: 13, lineHeight: 1.5,
                }}>
                  {status === 'expired'
                    ? 'This verification link has expired. Request a new one below.'
                    : 'This verification link is invalid. Request a new one below.'}
                </div>
                {resendSent ? (
                  <div style={{
                    padding: '12px 16px',
                    background: 'rgba(29,185,84,0.12)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--secondary)', fontSize: 13, lineHeight: 1.5,
                  }}>
                    Verification email resent. Check your inbox.
                  </div>
                ) : (
                  <>
                    {resendError && (
                      <div style={{
                        padding: '10px 14px', marginBottom: 14,
                        background: 'rgba(255,59,59,0.12)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#ff7070', fontSize: 13, lineHeight: 1.5,
                      }}>
                        {resendError}
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleResend}
                      disabled={resendLoading}
                    >
                      {resendLoading ? 'Sending…' : 'Resend verification email →'}
                    </button>
                  </>
                )}
              </>
            )}

            {/* ── Check your email (post-register, no status yet) ── */}
            {!status && (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'rgba(255,59,59,0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--primary)',
                  }}>
                    <Mail size={24} strokeWidth={1.75} />
                  </div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.4px' }}>
                  Check your email
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 28, lineHeight: 1.65 }}>
                  We sent a verification link to{' '}
                  {email
                    ? <span style={{ color: 'var(--light)', fontWeight: 600 }}>{email}</span>
                    : 'your email address'}.{' '}
                  Click it to activate your account.
                </div>
                {resendSent ? (
                  <div style={{
                    padding: '12px 16px',
                    background: 'rgba(29,185,84,0.12)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--secondary)', fontSize: 13, lineHeight: 1.5,
                  }}>
                    Verification email resent. Check your inbox.
                  </div>
                ) : (
                  <>
                    {resendError && (
                      <div style={{
                        padding: '10px 14px', marginBottom: 14,
                        background: 'rgba(255,59,59,0.12)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#ff7070', fontSize: 13, lineHeight: 1.5,
                      }}>
                        {resendError}
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleResend}
                      disabled={resendLoading || !email}
                    >
                      {resendLoading ? 'Sending…' : 'Resend verification email'}
                    </button>
                  </>
                )}
              </>
            )}

          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          style={{ fontSize: 12, color: 'var(--gray)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', paddingBottom: 8 }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { auth } from '../api'
import { Mail } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const token = searchParams.get('token')

  const [verifying, setVerifying] = useState(!!token)
  const [verifyError, setVerifyError] = useState(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const [resendError, setResendError] = useState(null)

  useEffect(() => {
    if (!token) return
    auth.verifyEmail(token)
      .then(() => navigate('/', { replace: true }))
      .catch(err => {
        setVerifyError(
          err.status === 400 || err.status === 404
            ? 'This verification link is invalid or has expired.'
            : 'Something went wrong. Please try again.'
        )
        setVerifying(false)
      })
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleResend() {
    setResendError(null)
    setResendSent(false)
    setResendLoading(true)
    try {
      await auth.resendVerification(user?.email)
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

  // Verifying token — show spinner
  if (verifying) {
    return (
      <div className="screen-bare">
        <div className="onboard-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" />
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 16 }}>Verifying your email…</p>
        </div>
      </div>
    )
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

            {verifyError ? (
              <>
                <div style={{
                  padding: '12px 16px', marginBottom: 20,
                  background: 'rgba(255,59,59,0.12)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ff7070', fontSize: 13, lineHeight: 1.5,
                }}>
                  {verifyError}
                </div>
                {user?.email && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleResend}
                    disabled={resendLoading || resendSent}
                  >
                    {resendLoading ? 'Sending…' : resendSent ? 'Email sent!' : 'Resend verification email →'}
                  </button>
                )}
              </>
            ) : (
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
                  <span style={{ color: 'var(--light)', fontWeight: 600 }}>{user?.email}</span>.
                  Click it to activate your account.
                </div>

                {resendSent ? (
                  <div style={{
                    padding: '12px 16px', marginBottom: 16,
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
                      disabled={resendLoading}
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

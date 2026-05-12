import { useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { auth } from '../api'
import { Mail } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const status = searchParams.get('status') // ok | already | expired | invalid | error | null
  const email  = searchParams.get('email')

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])

  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyError, setVerifyError] = useState(null)

  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const [resendError, setResendError] = useState(null)

  function handleCodeChange(i, val) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[i] = digit
    setCode(next)
    if (digit && i < 5) inputRefs.current[i + 1]?.focus()
  }

  function handleCodeKeyDown(i, e) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputRefs.current[i - 1]?.focus()
    }
  }

  function handleCodePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    e.preventDefault()
    const next = [...code]
    pasted.split('').forEach((d, i) => { next[i] = d })
    setCode(next)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  async function handleVerify(e) {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length < 6) return setVerifyError('Please enter the full 6-digit code.')
    setVerifyError(null)
    setVerifyLoading(true)
    try {
      await auth.verifyEmailCode(email, fullCode)
      navigate('/?verified=1')
    } catch (err) {
      if (err.status === 400 || err.status === 404) {
        setVerifyError('Invalid or expired code. Request a new one below.')
      } else {
        setVerifyError('Could not verify. Check your connection.')
      }
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setVerifyLoading(false)
    }
  }

  async function handleResend() {
    setResendError(null)
    setResendSent(false)
    setResendLoading(true)
    try {
      await auth.resendVerification(email)
      setResendSent(true)
      setCode(['', '', '', '', '', ''])
      setVerifyError(null)
      inputRefs.current[0]?.focus()
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

            {/* ── Code entry (post-register or expired/invalid) ── */}
            {(!status || status === 'expired' || status === 'invalid' || status === 'error') && (
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
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24, lineHeight: 1.65 }}>
                  We sent a 6-digit code to{' '}
                  {email
                    ? <span style={{ color: 'var(--light)', fontWeight: 600 }}>{email}</span>
                    : 'your email address'}.
                </div>

                {(status === 'expired' || status === 'invalid' || status === 'error') && (
                  <div style={{
                    padding: '10px 14px', marginBottom: 16,
                    background: 'rgba(255,59,59,0.12)',
                    borderRadius: 'var(--radius-sm)',
                    color: '#ff7070', fontSize: 13, lineHeight: 1.5,
                  }}>
                    {status === 'expired'
                      ? 'This code has expired. Request a new one below.'
                      : 'This code is invalid. Request a new one below.'}
                  </div>
                )}

                <form onSubmit={handleVerify}>
                  {/* 6-digit code boxes */}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }} onPaste={handleCodePaste}>
                    {code.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => inputRefs.current[i] = el}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleCodeChange(i, e.target.value)}
                        onKeyDown={e => handleCodeKeyDown(i, e)}
                        autoFocus={i === 0}
                        style={{
                          width: 42, height: 52,
                          textAlign: 'center',
                          fontSize: 22, fontWeight: 700,
                          background: 'var(--surface)',
                          border: `1.5px solid ${digit ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--light)',
                          outline: 'none',
                        }}
                      />
                    ))}
                  </div>

                  {verifyError && (
                    <div style={{
                      padding: '10px 14px', marginBottom: 14,
                      background: 'rgba(255,59,59,0.12)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#ff7070', fontSize: 13, lineHeight: 1.5,
                    }}>
                      {verifyError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={code.join('').length < 6 || verifyLoading}
                  >
                    {verifyLoading ? 'Verifying…' : 'Verify email →'}
                  </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  {resendSent ? (
                    <div style={{ fontSize: 12, color: 'var(--secondary)' }}>New code sent — check your inbox.</div>
                  ) : (
                    <>
                      {resendError && (
                        <div style={{ fontSize: 12, color: '#ff7070', marginBottom: 6 }}>{resendError}</div>
                      )}
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendLoading || !email}
                        style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {resendLoading ? 'Sending…' : "Didn't get a code? Resend"}
                      </button>
                    </>
                  )}
                </div>
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

import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { auth } from '../api'
import { Lock } from 'lucide-react'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <div className="screen-bare">
        <div className="onboard-screen">
          <div className="onboard-logo">Vibe<span>Shype</span> Pulse</div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#ff7070', fontSize: 14, textAlign: 'center' }}>
              Invalid or missing reset link. Please request a new one.
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={() => navigate('/')}>
            Back to login
          </button>
        </div>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true)
    try {
      await auth.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      if (err.name === 'AbortError' || !err.status) {
        setError('Could not reach the server. Check your connection.')
      } else if (err.status === 400 || err.status === 404) {
        setError('This reset link is invalid or has expired.')
      } else {
        setError('Something went wrong. Please try again.')
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
            Set a new password
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%' }}>
            {done ? (
              <div style={{ textAlign: 'center', lineHeight: 1.6 }}>
                <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 20 }}>
                  Your password has been updated. You can now log in.
                </p>
                <button type="button" className="btn-primary" onClick={() => navigate('/')}>
                  Go to login →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="input-wrap">
                  <input
                    type="password"
                    placeholder="New password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                  />
                  <span className="input-icon"><Lock size={15} strokeWidth={1.75} /></span>
                </div>

                <div className="input-wrap">
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                  <span className="input-icon"><Lock size={15} strokeWidth={1.75} /></span>
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
                  disabled={!password.trim() || !confirm.trim() || loading}
                >
                  {loading ? 'Saving…' : 'Set new password →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

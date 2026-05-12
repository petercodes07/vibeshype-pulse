import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function VerifyLogin() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { completeLogin } = useAuth()

  const email = searchParams.get('email') || ''
  const code  = searchParams.get('code')  || ''

  const [error, setError] = useState(null)

  useEffect(() => {
    if (!email || !code) {
      setError('Invalid link — missing email or code.')
      return
    }
    completeLogin(email, code, false)
      .then(() => navigate('/', { replace: true }))
      .catch(err => {
        if (err.status === 401) {
          setError('This code is incorrect.')
        } else if (err.status === 429) {
          setError('Too many attempts. Please log in again to get a new code.')
        } else if (err.status === 400) {
          setError('This link has expired. Please log in again.')
        } else {
          setError('Something went wrong. Please try logging in again.')
        }
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen-bare">
      <div className="onboard-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
        {!error ? (
          <>
            <div className="spinner" style={{ marginBottom: 16 }} />
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Signing you in…</p>
          </>
        ) : (
          <div style={{ width: '100%', padding: '0 8px' }}>
            <div style={{
              padding: '12px 16px', marginBottom: 24,
              background: 'rgba(255,59,59,0.12)',
              borderRadius: 'var(--radius-sm)',
              color: '#ff7070', fontSize: 13, lineHeight: 1.5,
            }}>
              {error}
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/', { replace: true })}
            >
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

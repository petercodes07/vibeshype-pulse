import { storage } from './storage'
import { mockAuth, mockPulse } from './mockApi'

const BASE = import.meta.env.VITE_API_URL || ''
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

if (USE_MOCK) {
  console.log('%c[api] MOCK MODE — no server calls will be made', 'color:#1db954;font-weight:700')
  console.log('[api] demo user: demo@pulse.app / password123')
  console.log('[api] verification / login code is always: 123456')
}

async function req(path, opts = {}) {
  const token = storage.get('pulse_token')
  const controller = new AbortController()
  const timeoutMs = opts.timeout ?? 4000
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const url = `${BASE}${path}`
  const method = opts.method || 'GET'
  console.log(`[api] → ${method} ${url}`)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
      ...opts,
    })
    console.log(`[api] ← ${method} ${url} ${res.status}`)
    if (!res.ok) {
      const err = new Error(`${res.status} ${res.statusText}`)
      err.status = res.status
      try { err.body = await res.json() } catch {}
      throw err
    }
    return res.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(`[api] TIMEOUT ${method} ${url} (>${timeoutMs}ms)`)
    } else {
      console.error(`[api] ERROR ${method} ${url}`, err.message)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

// ── Real backend ─────────────────────────────────────────────────────────────
// Session / account
//   GET  /api/auth/me              — current user (Bearer token)
//   PATCH /api/auth/me             — update profile (e.g. { name })
//   POST /api/auth/logout          — end session
//
// Sign up
//   POST /api/auth/register        — { email, password, name, acceptedTerms }
//                                    → sends verification email
//   GET  /api/auth/verify-email?token=…  (followed via email link)
//   POST /api/auth/resend-verification  — { email }
//
// Sign in (two-step, always)
//   POST /api/auth/login           — { email, password } → emails a 6-digit code
//   POST /api/auth/verify-login    — { email, code }     → returns session token
//
// Password
//   POST /api/auth/forgot-password — { email } (always 200)
// ─────────────────────────────────────────────────────────────────────────────

export const auth = USE_MOCK ? mockAuth : {
  me:                 ()                                  => req('/api/auth/me'),
  updateMe:           (fields)                            => req('/api/auth/me',                   { method: 'PATCH', body: JSON.stringify(fields) }),
  register:           (email, password, name)             => req('/api/auth/register',             { method: 'POST',  body: JSON.stringify({ email, password, name, acceptedTerms: true }) }),
  resendVerification: (email)                             => req('/api/auth/resend-verification',  { method: 'POST',  body: JSON.stringify({ email }) }),
  login:              (email, password)                   => req('/api/auth/login',                { method: 'POST',  body: JSON.stringify({ email, password }) }),
  verifyLogin:        (email, code)                       => req('/api/auth/verify-login',         { method: 'POST',  body: JSON.stringify({ email, code }) }),
  logout:             ()                                  => req('/api/auth/logout',               { method: 'POST' }),
  forgotPassword:     (email)                             => req('/api/auth/forgot-password',      { method: 'POST',  body: JSON.stringify({ email }) }),
  // Magic-link verification — confirms email from the link in the verify email.
  verifyEmail:        (token)                             => req(`/api/auth/verify-email?token=${encodeURIComponent(token)}`),
  // Companion to forgot-password — consumes the reset token from the email link.
  resetPassword:      (email, code, password)              => req('/api/auth/reset-password',       { method: 'POST',  body: JSON.stringify({ email, code, password }) }),
}

export const pulse = USE_MOCK ? mockPulse : {
  onboard:  (channelUrl)      => req('/api/pulse/onboard', { method: 'POST', body: JSON.stringify({ channelUrl }), timeout: 30000 }),
  profile:  ()                => req('/api/pulse/profile'),
  peers:    ()                => req('/api/pulse/peers'),
  savePeers:(channelIds)      => req('/api/pulse/peers', { method: 'PUT', body: JSON.stringify({ channelIds }) }),
  today:    ()                => req('/api/pulse/today'),
  act:      (recId, action)   => req(`/api/pulse/recommendations/${recId}/action`, { method: 'POST', body: JSON.stringify({ action }) }),
  history:  ()                => req('/api/pulse/history'),
}

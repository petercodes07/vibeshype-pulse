import { storage } from './storage'
import { mockAuth, mockPulse } from './mockApi'

const BASE       = import.meta.env.VITE_API_URL || ''
const AUTH_BASE  = 'https://vibeshype.com'   // auth  → live server (bypasses Vite proxy)
const PULSE_BASE = ''                         // pulse → Vite proxy → localhost:3001
const USE_MOCK   = import.meta.env.VITE_USE_MOCK === 'true'

if (USE_MOCK) {
  console.log('%c[api] MOCK MODE — no server calls will be made', 'color:#1db954;font-weight:700')
  console.log('[api] demo user: demo@pulse.app / password123')
  console.log('[api] verification / login code is always: 123456')
}

function authReq(path, opts = {}) {
  return req(path, { ...opts, _base: AUTH_BASE })
}

function pulseReq(path, opts = {}) {
  return req(path, { ...opts, _base: PULSE_BASE })
}

async function req(path, opts = {}) {
  const base = opts._base ?? BASE
  const token = storage.get('pulse_token')
  const controller = new AbortController()
  const timeoutMs = opts.timeout ?? 4000
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const url = `${base}${path}`
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
      console.error(`[api] ERROR ${method} ${url}`, err.message, err.body ?? '')
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
  me:                 ()                                  => authReq('/api/auth/me'),
  updateMe:           (fields)                            => authReq('/api/auth/me',                   { method: 'PATCH', body: JSON.stringify(fields) }),
  register:           (email, password, name)             => authReq('/api/auth/register',             { method: 'POST',  body: JSON.stringify({ email, password, name, acceptedTerms: true }) }),
  resendVerification: (email)                             => authReq('/api/auth/resend-verification',  { method: 'POST',  body: JSON.stringify({ email }) }),
  login:              (email, password)                   => authReq('/api/auth/login',                { method: 'POST',  body: JSON.stringify({ email, password }) }),
  verifyLogin:        (email, code)                       => authReq('/api/auth/verify-login',         { method: 'POST',  body: JSON.stringify({ email, code }) }),
  logout:             ()                                  => authReq('/api/auth/logout',               { method: 'POST' }),
  forgotPassword:     (email)                             => authReq('/api/auth/forgot-password',      { method: 'POST',  body: JSON.stringify({ email }), timeout: 10000 }),
  verifyEmail:        (token)                             => authReq(`/api/auth/verify-email?token=${encodeURIComponent(token)}`),
  resetPassword:      (email, code, password)             => authReq('/api/auth/reset-password',       { method: 'POST',  body: JSON.stringify({ email, code, password }) }),
}

export const rivals = {
  activity: (channelIds) =>
    req(`/api/rivals/activity?channelIds=${encodeURIComponent(channelIds)}`, { timeout: 15000 }),
}

export const pulse = USE_MOCK ? mockPulse : {
  onboard:       (channelUrl)  => req('/api/pulse/onboard',                          { method: 'POST', body: JSON.stringify({ channelUrl }), timeout: 15000, _base: 'https://vibeshype.com' }),
  onboardStatus: (analysisId) => req(`/api/pulse/onboard/${encodeURIComponent(analysisId)}/status`, { timeout: 10000, _base: 'https://vibeshype.com' }),
  profile:  ()                => pulseReq('/api/pulse/profile'),
  peers:    ()                => pulseReq('/api/pulse/peers'),
  savePeers:(channelIds)      => pulseReq('/api/pulse/peers', { method: 'PUT', body: JSON.stringify({ channelIds }) }),
  today:    ()                => pulseReq('/api/pulse/today'),
  act:      (recId, action)   => pulseReq(`/api/pulse/recommendations/${recId}/action`, { method: 'POST', body: JSON.stringify({ action }) }),
  history:  ()                => pulseReq('/api/pulse/history'),
}

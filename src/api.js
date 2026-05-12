import { storage } from './storage'

const BASE = import.meta.env.VITE_API_URL || ''

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
      throw err
    }
    return res.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(`[api] TIMEOUT ${method} ${url} (>4000ms)`)
    } else {
      console.error(`[api] ERROR ${method} ${url}`, err.message)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

export const auth = {
  me:             ()                                    => req('/api/auth/me'),
  updateMe:       (fields)                              => req('/api/auth/me',                { method: 'PATCH', body: JSON.stringify(fields) }),
  login:          (email, password)                     => req('/api/auth/login',             { method: 'POST',  body: JSON.stringify({ email, password }) }),
  register:       (email, password, emailOptIn = false) => req('/api/auth/register',          { method: 'POST',  body: JSON.stringify({ email, password, acceptedTerms: true, emailOptIn }) }),
  logout:         ()                                    => req('/api/auth/logout',            { method: 'POST' }),
  forgotPassword: (email)                               => req('/api/auth/forgot-password',   { method: 'POST',  body: JSON.stringify({ email }) }),
  resetPassword:  (token, password)                     => req('/api/auth/reset-password',    { method: 'POST',  body: JSON.stringify({ token, password }) }),
}

export const pulse = {
  onboard:  (channelUrl)      => req('/api/pulse/onboard', { method: 'POST', body: JSON.stringify({ channelUrl }), timeout: 30000 }),
  profile:  ()                => req('/api/pulse/profile'),
  peers:    ()                => req('/api/pulse/peers'),
  savePeers:(channelIds)      => req('/api/pulse/peers', { method: 'PUT', body: JSON.stringify({ channelIds }) }),
  today:    ()                => req('/api/pulse/today'),
  act:      (recId, action)   => req(`/api/pulse/recommendations/${recId}/action`, { method: 'POST', body: JSON.stringify({ action }) }),
  history:  ()                => req('/api/pulse/history'),
}

import { storage } from './storage'

const BASE = import.meta.env.VITE_API_URL || 'https://vibeshype.com'

async function req(path, opts = {}) {
  const token = storage.get('pulse_token')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    const res = await fetch(`${BASE}${path}`, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opts.headers,
      },
      ...opts,
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
  } finally {
    clearTimeout(timer)
  }
}

export const auth = {
  me:       ()                        => req('/api/auth/me'),
  login:    (email, password)         => req('/api/auth/login',  { method: 'POST', body: JSON.stringify({ email, password }) }),
  signup:   (email, password, name)   => req('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  logout:   ()                        => req('/api/auth/logout', { method: 'POST' }),
}

export const pulse = {
  onboard:  (channelUrl)      => req('/api/pulse/onboard', { method: 'POST', body: JSON.stringify({ channelUrl }) }),
  profile:  ()                => req('/api/pulse/profile'),
  peers:    ()                => req('/api/pulse/peers'),
  savePeers:(channelIds)      => req('/api/pulse/peers', { method: 'PUT', body: JSON.stringify({ channelIds }) }),
  today:    ()                => req('/api/pulse/today'),
  act:      (recId, action)   => req(`/api/pulse/recommendations/${recId}/action`, { method: 'POST', body: JSON.stringify({ action }) }),
  history:  ()                => req('/api/pulse/history'),
}

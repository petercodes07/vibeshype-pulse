// Frontend-only mock backend. Enabled when VITE_USE_MOCK=true.
// Mirrors the real auth contract:
//   register → email verification link
//   login    → emails a 6-digit code (no session yet)
//   verify-login → returns the session token

const DELAY = 400
const wait = (ms = DELAY) => new Promise(r => setTimeout(r, ms))

const db = (typeof window !== 'undefined' && window.__pulseMockDb) || {
  users: [
    { email: 'demo@pulse.app', password: 'password123', name: 'Demo User', verified: true },
  ],
  pendingLoginCodes: {},   // email → code (after POST /login)
  pendingVerifyCodes: {},  // email → code (after register)
  verifyTokens: {},        // token → email (verify-email magic link)
}
if (typeof window !== 'undefined') window.__pulseMockDb = db

function makeToken(email) { return `mock.${btoa(email)}.${Date.now()}` }
function err(status, message, extra = {}) {
  const e = new Error(message)
  e.status = status
  e.body = { message, ...extra }
  return e
}

export const mockAuth = {
  async me() {
    await wait(120)
    const token = localStorage.getItem('pulse_token') || sessionStorage.getItem('s:pulse_token')
    if (!token) throw err(401, 'Not authenticated')
    let email
    try {
      // Mock tokens look like `mock.<base64email>.<ts>` — anything else is stale.
      if (!token.startsWith('mock.')) throw new Error('not a mock token')
      email = atob(token.split('.')[1])
    } catch {
      throw err(401, 'Stale token from a non-mock session')
    }
    const user = db.users.find(u => u.email === email)
    if (!user) throw err(401, 'Not authenticated')
    return { email: user.email, name: user.name, emailVerified: user.verified }
  },

  async updateMe(fields) {
    await wait()
    const token = localStorage.getItem('pulse_token') || sessionStorage.getItem('s:pulse_token')
    if (!token || !token.startsWith('mock.')) throw err(401, 'Not authenticated')
    let email
    try { email = atob(token.split('.')[1]) } catch { throw err(401, 'Bad token') }
    const user = db.users.find(u => u.email === email)
    if (user && fields.name) user.name = fields.name
    return { ok: true, ...fields }
  },

  async register(email, password, name) {
    await wait()
    if (db.users.find(u => u.email === email)) throw err(409, 'Email already in use', { field: 'email' })
    db.users.push({ email, password, name, verified: false })
    const token = Math.random().toString(36).slice(2)
    db.verifyTokens[token] = email
    db.pendingVerifyCodes[email] = '123456'
    console.log(`[mock] verify link: /verify-email?token=${token}`)
    console.log(`[mock] verify code for ${email}: 123456`)
    return { ok: true }
  },

  async resendVerification(email) {
    await wait()
    db.pendingVerifyCodes[email] = '123456'
    console.log(`[mock] verify code for ${email}: 123456`)
    return { ok: true }
  },

  // Step 1 — always emails a code, never returns a session
  async login(email, password) {
    await wait()
    const user = db.users.find(u => u.email === email)
    if (!user || user.password !== password) throw err(401, 'Invalid credentials')
    if (!user.verified) throw err(403, 'Email not verified', { verificationRequired: true })
    db.pendingLoginCodes[email] = '123456'
    console.log(`[mock] login code for ${email}: 123456`)
    return { challengeRequired: true, email }
  },

  // Step 2 — consumes the code, returns the token
  async verifyLogin(email, code) {
    await wait()
    if (db.pendingLoginCodes[email] !== code) throw err(401, 'Wrong code')
    delete db.pendingLoginCodes[email]
    const user = db.users.find(u => u.email === email)
    return { token: makeToken(email), user: { email, name: user?.name } }
  },

  async logout() { await wait(120); return { ok: true } },

  async forgotPassword(email) {
    await wait()
    const token = Math.random().toString(36).slice(2)
    db.verifyTokens[token] = email
    console.log(`[mock] forgot-password requested for: ${email}`)
    console.log(`[mock] reset link: /reset-password?token=${token}`)
    return { ok: true } // always 200
  },

  async verifyEmail(token) {
    await wait()
    const email = db.verifyTokens[token]
    if (!email) throw err(400, 'Invalid or expired token')
    const user = db.users.find(u => u.email === email)
    if (user) user.verified = true
    delete db.verifyTokens[token]
    return { ok: true, email }
  },

  async resetPassword(token, password) {
    await wait()
    const email = db.verifyTokens[token]
    if (!email) throw err(400, 'Invalid or expired token')
    const user = db.users.find(u => u.email === email)
    if (user) user.password = password
    delete db.verifyTokens[token]
    return { ok: true }
  },
}

export const mockPulse = {
  async onboard() { await wait(800); return { ok: true } },
  async profile() { await wait(); return { niche: 'demo', tone: 'friendly' } },
  async peers() { await wait(); return [] },
  async savePeers() { await wait(); return { ok: true } },
  async today() { await wait(); return { picks: [] } },
  async act() { await wait(); return { ok: true } },
  async history() { await wait(); return [] },
}

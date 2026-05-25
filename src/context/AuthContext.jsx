import { createContext, useContext, useState, useEffect } from 'react'
import { auth } from '../api'
import { storage } from '../storage'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = loading, null = logged out

  useEffect(() => {
    const token = storage.get('pulse_token')
    if (!token) { setUser(null); return }

    auth.me()
      .then(data => setUser(data.user ?? data))
      .catch(() => {
        storage.remove('pulse_token')
        setUser(null)
      })
  }, [])

  // Step 1 — returns { challengeRequired: true, email } on 202; caller shows code input
  async function login(email, password, rememberMe = false) {
    const data = await auth.login(email, password, rememberMe)
    if (data.challengeRequired) return data
    // Fallback: if server ever returns a token directly
    _storeSession(data, email, rememberMe)
    return data
  }

  // Step 2 — called from inline code input OR VerifyLogin page
  async function completeLogin(email, code, rememberMe = false) {
    const data = await auth.verifyLogin(email, code)
    _storeSession(data, email, rememberMe)
    return data
  }

  function _storeSession(data, email, _rememberMe) {
    const token = data.token
    if (!token) throw new Error('No token in response.')
    storage.set('pulse_token', token, { persist: true })
    setUser(data.user ?? { email, emailVerified: true })
  }

  // register no longer returns a token — server sends verification email instead
  async function register(email, password, emailOptIn, username) {
    await auth.register(email, password, emailOptIn, username)
  }

  async function logout() {
    auth.logout().catch(() => {})
    storage.remove('pulse_token')
    storage.remove('pulse_onboarded')
    setUser(null)
  }

  return (
    <Ctx.Provider value={{ user, login, completeLogin, register, logout, loading: user === undefined }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) {
    // Returned when called outside AuthProvider (e.g. during HMR boundary crossing)
    return { user: undefined, loading: true, login: async () => {}, completeLogin: async () => {}, register: async () => {}, logout: () => {} }
  }
  return ctx
}

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

  async function login(email, password) {
    const data = await auth.login(email, password)
    const token = data.token
    if (!token) throw new Error('No token returned from server.')
    storage.set('pulse_token', token)
    setUser(data.user ?? { email })
    return data
  }

  async function logout() {
    auth.logout().catch(() => {})
    storage.remove('pulse_token')
    storage.remove('pulse_onboarded')
    setUser(null)
  }

  return (
    <Ctx.Provider value={{ user, login, logout, loading: user === undefined }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)

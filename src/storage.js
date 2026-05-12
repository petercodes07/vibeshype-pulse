// Abstraction over localStorage (web/Electron) vs Capacitor Preferences (iOS/Android).
// Swap the body of each method for @capacitor/preferences when building native.
// Keys stored in sessionStorage are prefixed with "s:" to allow coexistence with localStorage.

const SESSION_PREFIX = 's:'

export const storage = {
  get(key) {
    return sessionStorage.getItem(SESSION_PREFIX + key) ?? localStorage.getItem(key)
  },
  set(key, value, { persist = true } = {}) {
    if (persist) {
      localStorage.setItem(key, value)
      sessionStorage.removeItem(SESSION_PREFIX + key)
    } else {
      sessionStorage.setItem(SESSION_PREFIX + key, value)
      localStorage.removeItem(key)
    }
  },
  remove(key) {
    localStorage.removeItem(key)
    sessionStorage.removeItem(SESSION_PREFIX + key)
  },
}

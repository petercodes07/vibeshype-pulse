// Abstraction over localStorage (web/Electron) vs Capacitor Preferences (iOS/Android).
// Swap the body of each method for @capacitor/preferences when building native.

export const storage = {
  get(key) {
    return localStorage.getItem(key)
  },
  set(key, value) {
    localStorage.setItem(key, value)
  },
  remove(key) {
    localStorage.removeItem(key)
  },
}

/**
 * Global keyboard shortcut handler.
 *
 * Shortcuts:
 *   Ctrl/⌘ + 1   → Home
 *   Ctrl/⌘ + 2   → Today's Picks
 *   Ctrl/⌘ + 3   → Competitors
 *   Ctrl/⌘ + 4   → History
 *   Ctrl/⌘ + 5   → Profile
 *   Ctrl/⌘ + ,   → Settings
 *   Ctrl/⌘ + K   → Command palette
 *   ?             → Show shortcuts help
 *
 * Fires are suppressed when the user is typing in an input / textarea.
 */
import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const ROUTES = {
  '1': '/pulse/home',
  '2': '/pulse/today',
  '3': '/pulse/competitors',
  '4': '/pulse/history',
  '5': '/pulse/profile',
  ',': '/pulse/settings',
}

export default function useKeyboardShortcuts(onShowHelp, onShowPalette) {
  const navigate = useNavigate()

  const handler = useCallback((e) => {
    // Don't fire inside text inputs
    const tag = e.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return

    const ctrl = e.ctrlKey || e.metaKey

    if (ctrl && e.key === 'k') {
      e.preventDefault()
      onShowPalette?.()
      return
    }

    if (ctrl && ROUTES[e.key]) {
      e.preventDefault()
      navigate(ROUTES[e.key])
      return
    }

    if (!ctrl && !e.altKey && e.key === '?') {
      e.preventDefault()
      onShowHelp()
    }
  }, [navigate, onShowHelp, onShowPalette])

  useEffect(() => {
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handler])
}

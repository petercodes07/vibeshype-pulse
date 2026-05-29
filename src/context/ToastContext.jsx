/**
 * Global toast notification system.
 *
 * Usage:
 *   const showToast = useToast()
 *   showToast('Competitor added')            // success (green)
 *   showToast('Something went wrong', 'error') // error (red)
 *   showToast('FYI...', 'info')               // info (indigo)
 */
import { createContext, useContext, useState, useCallback } from 'react'
import { X } from 'lucide-react'

const ToastCtx = createContext(null)
let _nextId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback((message, type = 'success') => {
    const id = ++_nextId
    setToasts(q => [...q, { id, message, type }])
    setTimeout(() => setToasts(q => q.filter(t => t.id !== id)), 3500)
  }, [])

  const dismiss = useCallback((id) => setToasts(q => q.filter(t => t.id !== id)), [])

  return (
    <ToastCtx.Provider value={showToast}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', top: 16, right: 16,
          zIndex: 9999,
          display: 'flex', flexDirection: 'column', gap: 8,
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}>
          {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={dismiss} />)}
        </div>
      )}
    </ToastCtx.Provider>
  )
}

/** Returns showToast(message, type?). Safe to call outside provider. */
export function useToast() {
  return useContext(ToastCtx) ?? (() => {})
}

// ── Visual styles per type ────────────────────────────────────────────────────

const TSTYLES = {
  success: { accent: '#1db954', bg: 'rgba(14,32,18,0.97)', border: 'rgba(29,185,84,0.32)',  mark: '✓' },
  error:   { accent: '#ff7070', bg: 'rgba(34,10,10,0.97)', border: 'rgba(255,80,80,0.32)',  mark: '✕' },
  info:    { accent: '#818cf8', bg: 'rgba(14,14,34,0.97)', border: 'rgba(99,102,241,0.32)', mark: 'i' },
}

function ToastItem({ toast: t, onDismiss }) {
  const s = TSTYLES[t.type] ?? TSTYLES.info
  return (
    <div
      onClick={() => onDismiss(t.id)}
      style={{
        pointerEvents: 'all', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '11px 14px 11px 13px',
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 10,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        animation: 'toast-in 0.22s cubic-bezier(0.34,1.4,0.64,1)',
        maxWidth: 340,
        userSelect: 'none',
      }}
    >
      <span style={{
        fontSize: 12, fontWeight: 800, color: s.accent,
        width: 16, textAlign: 'center', flexShrink: 0,
      }}>
        {s.mark}
      </span>
      <span style={{
        fontSize: 13, fontWeight: 600, color: '#f0f0f0',
        flex: 1, lineHeight: 1.4,
      }}>
        {t.message}
      </span>
      <X size={11} strokeWidth={2.5} style={{ color: 'rgba(255,255,255,0.22)', marginLeft: 6, flexShrink: 0 }} />
    </div>
  )
}

/**
 * Keyboard shortcuts help modal.
 * Triggered by pressing '?' anywhere in the app (outside input fields).
 * Dismissed by Escape, clicking the backdrop, or the ✕ button.
 */
import { useEffect } from 'react'
import { X, Keyboard } from 'lucide-react'

// ── Shortcut definitions ──────────────────────────────────────────────────────

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
const MOD   = isMac ? '⌘' : 'Ctrl'

const SECTIONS = [
  {
    title: 'Navigate',
    rows: [
      { label: 'Home',           keys: [MOD, '1'] },
      { label: "Today's Picks",  keys: [MOD, '2'] },
      { label: 'Competitors',    keys: [MOD, '3'] },
      { label: 'History',        keys: [MOD, '4'] },
      { label: 'Profile',        keys: [MOD, '5'] },
      { label: 'Settings',       keys: [MOD, ','] },
    ],
  },
  {
    title: 'General',
    rows: [
      { label: 'Show shortcuts', keys: ['?']    },
      { label: 'Close modal',    keys: ['Esc']  },
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function ShortcutsModal({ onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: 'toast-in 0.18s ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 400,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
        }}>
          <Keyboard size={16} strokeWidth={1.75} color="var(--primary)" />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 800, letterSpacing: '-0.2px' }}>
            Keyboard Shortcuts
          </span>
          <button
            onClick={onClose}
            style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--surface2)', color: 'var(--gray)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>

        {/* Sections */}
        <div style={{ padding: '10px 0 6px' }}>
          {SECTIONS.map(section => (
            <div key={section.title} style={{ marginBottom: 6 }}>
              {/* Section label */}
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.8px', color: 'var(--gray)',
                padding: '6px 16px 4px',
              }}>
                {section.title}
              </div>

              {/* Rows */}
              {section.rows.map(({ label, keys }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 16px',
                  }}
                >
                  <span style={{ fontSize: 13, color: 'var(--light)' }}>{label}</span>
                  <KeyCombo keys={keys} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '10px 16px',
          fontSize: 11, color: 'var(--gray)', textAlign: 'center',
        }}>
          Press <Kbd>?</Kbd> anywhere to show this · <Kbd>Esc</Kbd> to close
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KeyCombo({ keys }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
      {keys.map((k, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {i > 0 && (
            <span style={{ fontSize: 10, color: 'var(--border)', userSelect: 'none' }}>+</span>
          )}
          <Kbd>{k}</Kbd>
        </span>
      ))}
    </div>
  )
}

function Kbd({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: '2px 7px',
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderBottomWidth: 2,
      borderRadius: 5,
      fontSize: 11, fontWeight: 700,
      fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
      color: 'var(--light)',
      minWidth: 24, textAlign: 'center',
      userSelect: 'none',
      letterSpacing: 0,
    }}>
      {children}
    </span>
  )
}

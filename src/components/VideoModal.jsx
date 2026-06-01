/**
 * VideoModal — lightweight YouTube embed overlay.
 *
 * Props:
 *   videoId  string   YouTube video ID
 *   title    string   shown in the header
 *   onClose  fn
 *
 * No deps beyond React. Uses youtube-nocookie.com for privacy-enhanced mode.
 */
import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function VideoModal({ videoId, title, onClose }) {
  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.82)',
        zIndex: 1100,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Header */}
      <div style={{
        width: '100%', maxWidth: 720,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
        padding: '0 2px',
      }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: 'var(--light)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          flex: 1, marginRight: 12,
        }}>
          {title}
        </div>
        <button
          onClick={onClose}
          style={{
            flexShrink: 0,
            width: 32, height: 32,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--light)', transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          title="Close (Esc)"
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>

      {/* Embed */}
      <div style={{
        width: '100%', maxWidth: 720,
        aspectRatio: '16/9',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        background: '#000',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
      }}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </div>

      {/* Hint */}
      <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
        Click outside or press <kbd style={{ fontSize: 10, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 3, padding: '1px 4px' }}>ESC</kbd> to close
      </div>
    </div>
  )
}

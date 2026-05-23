import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null, info: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[ErrorBoundary]', error, info)
  }

  reset = () => {
    this.setState({ error: null, info: null })
    try {
      localStorage.removeItem('pulse_token')
      sessionStorage.removeItem('s:pulse_token')
    } catch {}
  }

  hardReset = () => {
    try { localStorage.clear(); sessionStorage.clear() } catch {}
    location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    const msg = this.state.error?.message || String(this.state.error)
    const stack = this.state.info?.componentStack || this.state.error?.stack || ''
    return (
      <div style={{
        padding: 24, color: '#f8f8f8',
        background: '#0d0d0d', minHeight: '100vh', fontFamily: 'inherit',
      }}>
        <div style={{ maxWidth: 720, margin: '40px auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#ff7070', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
            Something broke
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 14, letterSpacing: -0.4 }}>
            {msg}
          </div>
          <pre style={{
            background: '#1e1e1e', border: '1px solid #333',
            borderRadius: 8, padding: 14, fontSize: 12,
            color: '#aaa', overflow: 'auto', maxHeight: 360,
            whiteSpace: 'pre-wrap',
          }}>{stack}</pre>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button
              onClick={this.reset}
              style={{ background: '#ff3b3b', color: '#fff', padding: '12px 18px', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              Clear session & retry
            </button>
            <button
              onClick={this.hardReset}
              style={{ background: '#282828', color: '#f8f8f8', padding: '12px 18px', borderRadius: 8, fontWeight: 700, border: 'none', cursor: 'pointer' }}
            >
              Wipe all storage & reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}

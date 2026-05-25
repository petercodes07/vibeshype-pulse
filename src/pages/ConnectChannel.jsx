/**
 * ConnectChannel — Step 1 of competitor discovery
 *
 * User pastes a YouTube channel URL / @handle / video URL.
 * On submit → POST /api/youtube/connect → navigates to /competitors with results.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tv, ArrowRight, Loader } from 'lucide-react'
import { youtube } from '../api'

export default function ConnectChannel() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    setError(null)
    setLoading(true)

    try {
      const data = await youtube.connect(input.trim())
      navigate('/competitors', { state: { channel: data.channel, competitors: data.competitors } })
    } catch (err) {
      setError(err.body?.error ?? err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen-bare">
      <div className="onboard-screen">
        <div>
          <div className="onboard-logo">Competitor <span>Finder</span></div>
          <div style={{ fontSize: 13, color: 'var(--gray)', marginTop: 4 }}>
            Discover your top 10 YouTube competitors, powered by AI.
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%' }}>
            <div className="onboard-heading" style={{ fontSize: 18 }}>
              What's your YouTube channel?
            </div>
            <div className="onboard-sub">
              Paste a channel URL, @handle, or any video link. We'll analyse your content
              and find channels competing for the same audience.
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-wrap">
                <input
                  type="text"
                  placeholder="https://youtube.com/@yourchannel"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  autoFocus
                  disabled={loading}
                />
                <span className="input-icon"><Tv size={15} strokeWidth={1.75} /></span>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', marginBottom: 14,
                  background: 'rgba(255,59,59,0.12)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#ff7070', fontSize: 13, lineHeight: 1.5,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={!input.trim() || loading}
              >
                {loading ? (
                  <><Loader size={16} className="spin" /> Analysing channel…</>
                ) : (
                  <>Find my competitors <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            {loading && (
              <div style={{ marginTop: 24, fontSize: 13, color: 'var(--gray)', lineHeight: 1.8 }}>
                <div>✓ Fetching channel metadata…</div>
                <div>✓ Pulling your latest 20 videos + transcripts…</div>
                <div>⋯ Generating AI embeddings…</div>
                <div>⋯ Running similarity search…</div>
                <div>⋯ Writing AI explanations…</div>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--gray)', fontSize: 12, paddingBottom: 8 }}>
          Accepts channel URL · @handle · video URL
        </div>
      </div>
    </div>
  )
}

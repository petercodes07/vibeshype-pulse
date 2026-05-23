import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { pulse } from '../api'
import { storage } from '../storage'
import { Tv, Film, Target, Check, Plus, ArrowLeft, RefreshCw } from 'lucide-react'

const DRAFT_KEY = 'pulse_onboard_draft'

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') } catch { return null }
}
function saveDraft(data) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
}
function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
}

const STEPS = ['Channel', 'Profile', 'Peers', 'Done']

export default function PulseOnboard() {
  const navigate = useNavigate()
  const draft = loadDraft()

  const [step,          setStep]          = useState(draft?.step ?? 0)
  const [channelUrl,    setChannelUrl]    = useState(draft?.channelUrl ?? '')
  const [profile,       setProfile]       = useState(draft?.profile ?? null)
  const [peers,         setPeers]         = useState(draft?.peers ?? [])
  const [selectedPeers, setSelectedPeers] = useState(new Set(draft?.selectedPeers ?? []))
  const [error,         setError]         = useState(null)

  // Two-phase state
  const [phase,          setPhase]          = useState('idle')   // 'idle' | 'resolving' | 'analyzing'
  const [channelPreview, setChannelPreview] = useState(null)     // fast Phase 1 data
  const [analysisId,     setAnalysisId]     = useState(null)
  const pollRef = useRef(null)

  // Persist draft only when not mid-analysis
  useEffect(() => {
    if (phase === 'idle') {
      saveDraft({ step, channelUrl, profile, peers, selectedPeers: [...selectedPeers] })
    }
  }, [step, channelUrl, profile, peers, selectedPeers, phase])

  // ── Polling: runs whenever we enter the 'analyzing' phase ────────────────────
  useEffect(() => {
    if (phase !== 'analyzing' || !analysisId) return

    const poll = async () => {
      try {
        const data = await pulse.onboardStatus(analysisId)
        if (data.status === 'complete') {
          stop()
          setProfile(data.profile)
          setPeers(data.suggestedPeers ?? [])
          setSelectedPeers(new Set((data.suggestedPeers ?? []).slice(0, 5).map(p => p.channelId)))
          setPhase('idle')
          setStep(1)
        } else if (data.status === 'failed') {
          stop()
          setPhase('idle')
          setError(data.error || 'Analysis failed. Please try again.')
        }
        // status === 'analyzing' → keep polling
      } catch {
        // transient network error — keep polling
      }
    }

    function stop() {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    pollRef.current = setInterval(poll, 3000)
    return stop
  }, [phase, analysisId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Returns a promise that resolves with completed data, polling every 3 s. */
  function pollUntilComplete(id, timeoutMs = 90_000) {
    return new Promise((resolve, reject) => {
      const deadline = setTimeout(() => {
        clearInterval(iv)
        reject(new Error('Analysis timed out'))
      }, timeoutMs)

      const iv = setInterval(async () => {
        try {
          const data = await pulse.onboardStatus(id)
          if (data.status === 'complete') {
            clearInterval(iv)
            clearTimeout(deadline)
            resolve(data)
          } else if (data.status === 'failed') {
            clearInterval(iv)
            clearTimeout(deadline)
            reject(new Error(data.error || 'Analysis failed'))
          }
        } catch { /* keep trying */ }
      }, 3000)
    })
  }

  // ── Step handlers ─────────────────────────────────────────────────────────────

  async function handleChannelSubmit() {
    if (!channelUrl.trim()) return
    setError(null)
    setPhase('resolving')
    try {
      const data = await pulse.onboard(channelUrl)

      if (data.analysisId) {
        // ── Two-phase flow ───────────────────────────────────────────────────
        // Phase 1 returned immediately — show channel info now, poll Phase 2
        setChannelPreview(data.channel ?? null)
        setAnalysisId(data.analysisId)
        setPhase('analyzing')          // triggers polling useEffect above
      } else {
        // ── Legacy single-phase fallback ──────────────────────────────────
        setProfile(data.profile)
        setPeers(data.suggestedPeers ?? [])
        setSelectedPeers(new Set((data.suggestedPeers ?? []).slice(0, 5).map(p => p.channelId)))
        setPhase('idle')
        setStep(1)
      }
    } catch (err) {
      setPhase('idle')
      if (err.name === 'AbortError' || !err.status) {
        setError('Could not reach the server. Check your connection and try again.')
      } else {
        setError('Could not find that channel. Check the URL and try again.')
      }
    }
  }

  async function handleRefreshPeers() {
    if (!channelUrl.trim()) return
    setError(null)
    // Re-use the loading flag on StepPeers
    setPhase('resolving')
    try {
      const data = await pulse.onboard(channelUrl)
      let result = data
      if (data.analysisId) {
        result = await pollUntilComplete(data.analysisId)
      }
      setPeers(result.suggestedPeers ?? [])
      setSelectedPeers(new Set((result.suggestedPeers ?? []).slice(0, 5).map(p => p.channelId)))
    } catch {
      setError('Could not refresh suggestions. Please try again.')
    } finally {
      setPhase('idle')
    }
  }

  async function handlePeersConfirm() {
    setError(null)
    setPhase('resolving')
    try {
      await pulse.savePeers([...selectedPeers])
      setPhase('idle')
      setStep(3)
    } catch (err) {
      setPhase('idle')
      setError(
        !err.status
          ? 'Could not reach the server. Check your connection.'
          : 'Could not save your peers. Please try again.'
      )
    }
  }

  function togglePeer(id) {
    setSelectedPeers(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function addCustomPeer(url) {
    const id = `custom_${url}`
    const name = url.replace(/^https?:\/\/(www\.)?youtube\.com\/@?/, '').replace(/^@/, '') || url
    setPeers(prev => {
      if (prev.some(p => p.channelId === id)) return prev
      return [...prev, { channelId: id, name, subs: 'competitor', avatar: null }]
    })
    setSelectedPeers(prev => new Set([...prev, id]))
  }

  function finish() {
    if (peers.length) {
      localStorage.setItem('pulse_suggested_rivals', JSON.stringify(peers))
    }
    if (profile?.channelId) {
      localStorage.setItem('pulse_channel_id', profile.channelId)
    }
    storage.set('pulse_onboarded', 'true')
    clearDraft()
    navigate('/pulse/home')
  }

  // Swipe navigation
  const swipeStartX = useRef(null)
  function handleTouchStart(e) { swipeStartX.current = e.touches[0].clientX }
  function handleTouchEnd(e) {
    if (swipeStartX.current === null) return
    const delta = e.changedTouches[0].clientX - swipeStartX.current
    swipeStartX.current = null
    if (Math.abs(delta) < 50 || phase !== 'idle') return
    if (delta < 0) {
      if (step === 0 && profile) setStep(1)
      else if (step === 1) setStep(2)
      else if (step === 2) handlePeersConfirm()
    } else {
      if (step === 1) setStep(0)
      else if (step === 2) setStep(1)
    }
  }

  const busy = phase !== 'idle'

  return (
    <div className="screen-bare">
      <div className="onboard-screen" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="onboard-logo">Vibe<span>Shype</span> Pulse</div>

        <div className="step-dots">
          {STEPS.map((s, i) => (
            <div key={s} className={`step-dot${i === step ? ' active' : i < step ? ' done' : ''}`} />
          ))}
        </div>

        {step === 0 && (
          <StepChannel
            url={channelUrl}
            onChange={setChannelUrl}
            onSubmit={handleChannelSubmit}
            phase={phase}
            channelPreview={channelPreview}
            error={error}
          />
        )}
        {step === 1 && profile && (
          <StepProfile profile={profile} onNext={() => setStep(2)} onBack={() => setStep(0)} />
        )}
        {step === 2 && (
          <StepPeers
            peers={peers}
            selected={selectedPeers}
            onToggle={togglePeer}
            onAddCustom={addCustomPeer}
            onConfirm={handlePeersConfirm}
            onBack={() => setStep(1)}
            onRefresh={handleRefreshPeers}
            loading={busy}
            error={error}
          />
        )}
        {step === 3 && (
          <StepDone onFinish={finish} />
        )}
      </div>
    </div>
  )
}

// ── Step 0: Channel URL + two-phase analysing state ───────────────────────────

function StepChannel({ url, onChange, onSubmit, phase, channelPreview, error }) {
  // ── Phase: resolving (Phase 1 in-flight, <1s) ──
  if (phase === 'resolving') {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center',
      }}>
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>
          Checking channel…
        </div>
      </div>
    )
  }

  // ── Phase: analyzing (Phase 2 polling) ──
  if (phase === 'analyzing') {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 20, paddingTop: 16, textAlign: 'center',
      }}>
        {/* Channel preview — shown immediately from Phase 1 */}
        {channelPreview && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            background: 'var(--surface)', borderRadius: 'var(--radius)',
            border: '1px solid var(--border)', padding: '20px 24px', width: '100%',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--surface2)', overflow: 'hidden',
              border: '2px solid var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {channelPreview.thumbnail_url
                ? <img src={channelPreview.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Tv size={24} color="var(--gray)" />
              }
            </div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>
              {channelPreview.channelName}
            </div>
            {channelPreview.subs && (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {channelPreview.subs} subscribers
              </div>
            )}
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--secondary)',
              background: 'rgba(29,185,84,0.12)', padding: '3px 10px', borderRadius: 100,
            }}>
              ✓ Channel found
            </div>
          </div>
        )}

        {/* Analysis progress */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <div style={{ fontSize: 15, fontWeight: 700 }}>Analysing your content…</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, maxWidth: 260 }}>
            We're studying your recent videos and finding
            competitor channels in your niche.
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray)' }}>
            Usually takes 20–40 seconds
          </div>
        </div>

        {/* Bouncing dots */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--primary)', opacity: 0.3,
              animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </div>
      </div>
    )
  }

  // ── Idle: normal URL input ──
  return (
    <>
      <div className="onboard-heading">What's your channel?</div>
      <div className="onboard-sub">
        Paste your YouTube channel URL or handle. We'll analyse your recent videos to understand your niche.
      </div>
      <div className="input-wrap">
        <input
          type="url"
          placeholder="https://youtube.com/@yourchannel"
          value={url}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSubmit()}
          autoFocus
        />
        <span className="input-icon"><Tv size={15} strokeWidth={1.75} /></span>
      </div>
      {error && (
        <div style={{
          padding: '10px 14px', marginBottom: 4,
          background: 'rgba(255,59,59,0.12)', borderRadius: 'var(--radius-sm)',
          color: '#ff7070', fontSize: 13, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}
      <button className="btn-primary" disabled={!url.trim()} onClick={onSubmit}>
        Analyse my channel →
      </button>
    </>
  )
}

// ── Step 1: Profile review ────────────────────────────────────────────────────

function StepProfile({ profile, onNext, onBack }) {
  return (
    <>
      <button type="button" className="back-link" onClick={onBack} style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
        <ArrowLeft size={14} /> Back
      </button>
      <div className="onboard-heading">Your channel profile</div>
      <div className="onboard-sub">
        We detected this from your recent videos. This shapes which songs we'll surface for you.
      </div>

      <div className="profile-section">
        <div className="profile-section-label">Channel</div>
        <div className="profile-chips">
          <span className="profile-chip highlight"><Tv size={12} strokeWidth={1.75} /> {profile.channelName}</span>
          <span className="profile-chip green"><Film size={12} strokeWidth={1.75} /> {profile.format}</span>
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-label">Genres</div>
        <div className="profile-chips">
          {profile.genres.map(g => (
            <span key={g} className="profile-chip">{g}</span>
          ))}
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-label">Languages</div>
        <div className="profile-chips">
          {profile.languages.map(l => (
            <span key={l} className="profile-chip">{l}</span>
          ))}
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section-label">Avg video length</div>
        <div className="profile-chips">
          <span className="profile-chip">{Math.round(profile.avgDuration / 60)}m {profile.avgDuration % 60}s</span>
        </div>
      </div>

      <div className="mt-auto" style={{ paddingTop: 24 }}>
        <button className="btn-primary" onClick={onNext}>Looks right → pick peers</button>
      </div>
    </>
  )
}

// ── Step 2: Peers ─────────────────────────────────────────────────────────────

function StepPeers({ peers, selected, onToggle, onAddCustom, onConfirm, onBack, onRefresh, loading, error }) {
  const [customUrl, setCustomUrl] = useState('')

  function handleAdd() {
    const val = customUrl.trim()
    if (!val) return
    onAddCustom(val)
    setCustomUrl('')
  }

  return (
    <>
      <button type="button" className="back-link" onClick={onBack} style={{ alignSelf: 'flex-start', marginBottom: 8 }}>
        <ArrowLeft size={14} /> Back
      </button>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 8 }}>
        <div className="onboard-heading" style={{ marginBottom: 0 }}>Choose your peer set</div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh suggestions"
          style={{ background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--muted)', padding: 4, opacity: loading ? 0.4 : 1 }}
        >
          <RefreshCw size={16} strokeWidth={1.75} className={loading ? 'spin' : ''} />
        </button>
      </div>
      <div className="onboard-sub">
        These are channels in your niche. We'll monitor them daily to find songs that are breaking out before you post.
      </div>

      <div className="peer-add-row">
        <div className="input-wrap" style={{ flex: 1, marginBottom: 0 }}>
          <input
            type="url"
            placeholder="Add a competitor (channel URL or @handle)"
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <span className="input-icon"><Tv size={15} strokeWidth={1.75} /></span>
        </div>
        <button className="btn-icon" onClick={handleAdd} disabled={!customUrl.trim()}>
          <Plus size={18} strokeWidth={2} />
        </button>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', marginBottom: 4,
          background: 'rgba(255,59,59,0.12)', borderRadius: 'var(--radius-sm)',
          color: '#ff7070', fontSize: 13, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      <button
        className="btn-primary"
        disabled={selected.size === 0 || loading}
        onClick={onConfirm}
      >
        {loading ? 'Saving…' : `Lock in ${selected.size} peers →`}
      </button>

      <div className="peer-count-note" style={{ marginTop: 16 }}>{selected.size} of {peers.length} selected</div>

      <div className="peer-list">
        {peers.map(peer => (
          <div
            key={peer.channelId}
            className={`peer-item${selected.has(peer.channelId) ? ' selected' : ''}`}
            onClick={() => onToggle(peer.channelId)}
          >
            <div className="peer-avatar">
              {peer.avatar ? <img src={peer.avatar} alt="" /> : peer.name[0]}
            </div>
            <div className="peer-info">
              <div className="peer-name">{peer.name}</div>
              <div className="peer-subs">{peer.subs} subscribers</div>
            </div>
            <div className="peer-check">
              {selected.has(peer.channelId) ? <Check size={16} strokeWidth={2.5} /> : ''}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Step 3: Done ──────────────────────────────────────────────────────────────

function StepDone({ onFinish }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', gap: 16,
    }}>
      <Target size={64} strokeWidth={1.25} style={{ color: 'var(--primary)' }} />
      <div className="onboard-heading" style={{ marginBottom: 0 }}>You're all set.</div>
      <div className="onboard-sub" style={{ marginBottom: 0 }}>
        Your first picks are being generated now. We'll notify you every morning at 7am with today's best songs to post.
      </div>
      <div style={{ height: 32 }} />
      <button className="btn-primary" onClick={onFinish}>See today's picks →</button>
    </div>
  )
}

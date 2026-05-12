import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { pulse } from '../api'
import { storage } from '../storage'
import { Tv, Film, Target, Check, Plus } from 'lucide-react'

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
  const [step, setStep] = useState(draft?.step ?? 0)
  const [channelUrl, setChannelUrl] = useState(draft?.channelUrl ?? '')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(draft?.profile ?? null)
  const [peers, setPeers] = useState(draft?.peers ?? [])
  const [selectedPeers, setSelectedPeers] = useState(new Set(draft?.selectedPeers ?? []))
  const [error, setError] = useState(null)

  useEffect(() => {
    saveDraft({ step, channelUrl, profile, peers, selectedPeers: [...selectedPeers] })
  }, [step, channelUrl, profile, peers, selectedPeers])

  async function handleChannelSubmit() {
    if (!channelUrl.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await pulse.onboard(channelUrl)
      setProfile(data.profile)
      setPeers(data.suggestedPeers ?? [])
      setSelectedPeers(new Set((data.suggestedPeers ?? []).slice(0, 5).map(p => p.channelId)))
      setStep(1)
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Analysis timed out. The server took too long — please try again.')
      } else if (!err.status) {
        setError('Could not reach the server. Check your connection.')
      } else {
        setError('Could not analyse that channel. Check the URL and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handlePeersConfirm() {
    setLoading(true)
    setError(null)
    try {
      await pulse.savePeers([...selectedPeers])
      setStep(3)
    } catch (err) {
      setError(
        !err.status
          ? 'Could not reach the server. Check your connection.'
          : 'Could not save your peers. Please try again.'
      )
    } finally {
      setLoading(false)
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
    storage.set('pulse_onboarded', 'true')
    clearDraft()
    navigate('/pulse/today')
  }

  const swipeStartX = useRef(null)

  function handleTouchStart(e) {
    swipeStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    if (swipeStartX.current === null) return
    const delta = e.changedTouches[0].clientX - swipeStartX.current
    swipeStartX.current = null
    if (Math.abs(delta) < 50) return

    if (delta < 0) {
      // swipe left → forward
      if (step === 0 && profile) setStep(1)
      else if (step === 1) setStep(2)
      else if (step === 2 && !loading) handlePeersConfirm()
    } else {
      // swipe right → back
      if (step === 1) setStep(0)
      else if (step === 2) setStep(1)
    }
  }

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
            loading={loading}
            error={error}
          />
        )}
        {step === 1 && profile && (
          <StepProfile profile={profile} onNext={() => setStep(2)} />
        )}
        {step === 2 && (
          <StepPeers
            peers={peers}
            selected={selectedPeers}
            onToggle={togglePeer}
            onAddCustom={addCustomPeer}
            onConfirm={handlePeersConfirm}
            loading={loading}
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

function StepChannel({ url, onChange, onSubmit, loading, error }) {
  return (
    <>
      <div className="onboard-heading">What's your channel?</div>
      <div className="onboard-sub">
        Paste your YouTube channel URL or handle. We'll analyse your last 30 videos to understand your niche.
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
          background: 'rgba(255,59,59,0.12)',
          borderRadius: 'var(--radius-sm)',
          color: '#ff7070', fontSize: 13, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}
      <button
        className="btn-primary"
        disabled={!url.trim() || loading}
        onClick={onSubmit}
      >
        {loading ? 'Analysing your channel…' : 'Analyse my channel →'}
      </button>
    </>
  )
}

function StepProfile({ profile, onNext }) {
  return (
    <>
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

function StepPeers({ peers, selected, onToggle, onAddCustom, onConfirm, loading, error }) {
  const [customUrl, setCustomUrl] = useState('')

  function handleAdd() {
    const val = customUrl.trim()
    if (!val) return
    onAddCustom(val)
    setCustomUrl('')
  }

  return (
    <>
      <div className="onboard-heading">Choose your peer set</div>
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
          background: 'rgba(255,59,59,0.12)',
          borderRadius: 'var(--radius-sm)',
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

function StepDone({ onFinish }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
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

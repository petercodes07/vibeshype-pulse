import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pulse } from '../api'
import { storage } from '../storage'

const STEPS = ['Channel', 'Profile', 'Peers', 'Done']

const MOCK_PROFILE = {
  channelName: 'LyricsVibes',
  genres: ['Pop', 'R&B', 'Hip-Hop'],
  languages: ['English', 'Arabic'],
  format: 'Lyric video',
  avgDuration: 210,
}

const MOCK_PEERS = [
  { channelId: 'UC001', name: 'SoundWave Lyrics', subs: '2.3M', avatar: null },
  { channelId: 'UC002', name: 'MusicBox Arabic', subs: '1.8M', avatar: null },
  { channelId: 'UC003', name: 'TopHitsLyrics', subs: '950K', avatar: null },
  { channelId: 'UC004', name: 'HitSongLyrics', subs: '780K', avatar: null },
  { channelId: 'UC005', name: 'ViralLyric', subs: '640K', avatar: null },
  { channelId: 'UC006', name: 'LyricMaster', subs: '510K', avatar: null },
  { channelId: 'UC007', name: 'BeatLyrics', subs: '430K', avatar: null },
  { channelId: 'UC008', name: 'PopLyricHub', subs: '390K', avatar: null },
]

export default function PulseOnboard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [channelUrl, setChannelUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [peers, setPeers] = useState([])
  const [selectedPeers, setSelectedPeers] = useState(new Set())

  async function handleChannelSubmit() {
    if (!channelUrl.trim()) return
    setLoading(true)
    try {
      const data = await pulse.onboard(channelUrl)
      setProfile(data.profile ?? MOCK_PROFILE)
      setPeers(data.suggestedPeers ?? MOCK_PEERS)
      setSelectedPeers(new Set((data.suggestedPeers ?? MOCK_PEERS).slice(0, 5).map(p => p.channelId)))
    } catch {
      setProfile(MOCK_PROFILE)
      setPeers(MOCK_PEERS)
      setSelectedPeers(new Set(MOCK_PEERS.slice(0, 5).map(p => p.channelId)))
    } finally {
      setLoading(false)
      setStep(1)
    }
  }

  async function handlePeersConfirm() {
    setLoading(true)
    try {
      await pulse.savePeers([...selectedPeers])
    } catch {}
    setLoading(false)
    setStep(3)
  }

  function togglePeer(id) {
    setSelectedPeers(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function finish() {
    storage.set('pulse_onboarded', 'true')
    navigate('/pulse/today')
  }

  return (
    <div className="screen-bare">
      <div className="onboard-screen">
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
            onConfirm={handlePeersConfirm}
            loading={loading}
          />
        )}
        {step === 3 && (
          <StepDone onFinish={finish} />
        )}
      </div>
    </div>
  )
}

function StepChannel({ url, onChange, onSubmit, loading }) {
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
        <span className="input-icon">📺</span>
      </div>
      <button
        className="btn-primary"
        disabled={!url.trim() || loading}
        onClick={onSubmit}
      >
        {loading ? 'Analysing…' : 'Analyse my channel →'}
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
          <span className="profile-chip highlight">📺 {profile.channelName}</span>
          <span className="profile-chip green">🎬 {profile.format}</span>
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

function StepPeers({ peers, selected, onToggle, onConfirm, loading }) {
  return (
    <>
      <div className="onboard-heading">Choose your peer set</div>
      <div className="onboard-sub">
        These are channels in your niche. We'll monitor them daily to find songs that are breaking out before you post.
      </div>

      <div className="peer-count-note">{selected.size} of {peers.length} selected</div>

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
              {selected.has(peer.channelId) ? '✓' : ''}
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn-primary"
        disabled={selected.size === 0 || loading}
        onClick={onConfirm}
      >
        {loading ? 'Saving…' : `Lock in ${selected.size} peers →`}
      </button>
    </>
  )
}

function StepDone({ onFinish }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 16 }}>
      <div style={{ fontSize: 64 }}>🎯</div>
      <div className="onboard-heading" style={{ marginBottom: 0 }}>You're all set.</div>
      <div className="onboard-sub" style={{ marginBottom: 0 }}>
        Your first picks are being generated now. We'll notify you every morning at 7am with today's best songs to post.
      </div>
      <div style={{ height: 32 }} />
      <button className="btn-primary" onClick={onFinish}>See today's picks →</button>
    </div>
  )
}

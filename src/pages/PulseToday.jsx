import { useState, useEffect, useRef, useCallback } from 'react'
import PickCard from '../components/PickCard'
import { pulse } from '../api'
import { Search, RefreshCw } from 'lucide-react'

const MOCK_PICKS = [
  {
    id: '1',
    title: 'Die With A Smile',
    artist: 'Lady Gaga & Bruno Mars',
    cover: 'https://i.scdn.co/image/ab67616d0000b273f953f3a2b59e5e3bdd9bcc62',
    reason: '4 peer channels in your niche posted this in the last 36 hours — it\'s hitting 2.8K views/hour across the cluster and still climbing.',
    peerCount: 4,
    viewsPerHour: 2800,
    chartRank: 8,
    lyricsAvailable: true,
    variant: 'original',
    sources: [
      { name: 'LyricsVibes', views: 142000 },
      { name: 'SoundWave Lyrics', views: 98000 },
      { name: 'MusicBox Arabic', views: 67000 },
      { name: 'TopHitsLyrics', views: 44000 },
    ],
  },
  {
    id: '2',
    title: 'Espresso',
    artist: 'Sabrina Carpenter',
    cover: 'https://i.scdn.co/image/ab67616d0000b273e2e352d89826aef6dbd5ff8f',
    reason: '2 top peers posted it yesterday and it\'s outperforming their channel median by 3.2×. Lyrics are synced on LRCLIB.',
    peerCount: 2,
    viewsPerHour: 1200,
    chartRank: 22,
    lyricsAvailable: true,
    variant: 'original',
    sources: [
      { name: 'LyricsVibes', views: 89000 },
      { name: 'HitSongLyrics', views: 51000 },
    ],
  },
  {
    id: '3',
    title: 'APT.',
    artist: 'ROSÉ & Bruno Mars',
    cover: 'https://i.scdn.co/image/ab67616d0000b2739bbfd3a54a73522f2f38c9ef',
    reason: 'Cross-genre breakout — 3 Arabic lyric channels and 2 global pop channels posted it this week. TikTok usage up 180% in 24h.',
    peerCount: 3,
    viewsPerHour: 3400,
    chartRank: 5,
    lyricsAvailable: true,
    variant: 'slowed',
    sources: [
      { name: 'MusicBox Arabic', views: 210000 },
      { name: 'SoundWave Lyrics', views: 178000 },
      { name: 'LyricsVibes', views: 134000 },
    ],
  },
]

export default function PulseToday() {
  const [picks, setPicks] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const pollRef = useRef(null)

  const loadPicks = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const data = await pulse.today()
      const p = data.picks ?? []
      setPicks(p)
      if (p.length > 0 && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    } catch {
      // keep whatever was shown before on error
    } finally {
      if (showSpinner) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadPicks()
    // poll every 60s while picks are empty
    pollRef.current = setInterval(() => loadPicks(), 60_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [loadPicks])

  function handleAction(id, action) {
    pulse.act(id, action).catch(() => {})
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const displayPicks = picks ?? []

  return (
    <div className="screen">
      <div className="today-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="today-date">{today}</div>
            <div className="today-title">Today's Picks</div>
          </div>
          <button
            onClick={() => loadPicks(true)}
            disabled={refreshing || picks === null}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 8, opacity: refreshing ? 0.4 : 1 }}
            title="Refresh picks"
          >
            <RefreshCw size={16} strokeWidth={1.75} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
        <div className="today-sub">
          {picks === null
            ? 'Loading your picks…'
            : displayPicks.length === 0
            ? 'Generating your picks — checking back every minute…'
            : `${displayPicks.length} song${displayPicks.length > 1 ? 's' : ''} trending in your niche`}
        </div>
      </div>

      {picks === null ? (
        <div className="loading-screen" style={{ height: 300 }}>
          <div className="spinner" />
          Analysing your peer channels…
        </div>
      ) : mainPicks.length === 0 ? (
        <div className="picks-empty">
          <div className="picks-empty-icon"><div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} /></div>
          <div className="picks-empty-title">Generating your picks…</div>
          <p className="text-muted">Hang tight — we're analysing your peer channels right now. This page refreshes automatically.</p>
          <button
            className="btn-primary"
            style={{ marginTop: 16, maxWidth: 220 }}
            onClick={() => loadPicks(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Checking…' : 'Check now'}
          </button>
        </div>
      ) : (
        displayPicks.map((pick, i) => (
          <PickCard key={pick.id} pick={pick} rank={i + 1} onAction={handleAction} />
        ))
      )}
    </div>
  )
}

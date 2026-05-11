import { useState, useEffect } from 'react'
import PickCard from '../components/PickCard'
import { pulse } from '../api'

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
  const [showMore, setShowMore] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    pulse.today()
      .then(data => setPicks(data.picks ?? []))
      .catch(() => setPicks(MOCK_PICKS))
  }, [])

  function handleAction(id, action) {
    pulse.act(id, action).catch(() => {})
  }

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const displayPicks = picks ?? []
  const mainPicks = displayPicks.slice(0, 5)

  return (
    <div className="screen">
      <div className="today-header">
        <div className="today-date">{today}</div>
        <div className="today-title">Today's Picks</div>
        <div className="today-sub">
          {picks === null
            ? 'Loading your picks…'
            : mainPicks.length === 0
            ? 'No picks today — check back later.'
            : `${mainPicks.length} song${mainPicks.length > 1 ? 's' : ''} trending in your niche`}
        </div>
      </div>

      {picks === null ? (
        <div className="loading-screen" style={{ height: 300 }}>
          <div className="spinner" />
          Analysing your peer channels…
        </div>
      ) : mainPicks.length === 0 ? (
        <div className="picks-empty">
          <div className="picks-empty-icon">🔍</div>
          <div className="picks-empty-title">Nothing cleared the bar today</div>
          <p className="text-muted">We'd rather show you 0 great picks than 5 mediocre ones. Check back tomorrow.</p>
        </div>
      ) : (
        mainPicks.map((pick, i) => (
          <PickCard key={pick.id} pick={pick} rank={i + 1} onAction={handleAction} />
        ))
      )}

      {!showMore && displayPicks.length > 5 && (
        <button className="show-more-btn" onClick={() => setShowMore(true)}>
          Show {displayPicks.length - 5} more (lower confidence)
        </button>
      )}
      {showMore && displayPicks.slice(5).map((pick, i) => (
        <PickCard key={pick.id} pick={pick} rank={i + 6} onAction={handleAction} />
      ))}
    </div>
  )
}

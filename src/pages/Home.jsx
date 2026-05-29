import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { pulse, rivals } from '../api'
import { fetchYouTubeRSS } from '../utils/youtube'
import {
  Tv, Flame, TrendingUp, Trophy, ChevronRight,
  Music2, Play, Check, X, RefreshCw, Swords, UserCircle,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting(user) {
  const h = new Date().getHours()
  const name = user?.username ?? user?.email?.split('@')[0] ?? 'there'
  if (h < 12) return `Good morning, ${name}`
  if (h < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
}

function loadLS(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback }
  catch { return fallback }
}

function fmtK(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const GRADIENTS = [
  ['#1a1a2e', '#16213e'], ['#2d1b69', '#11998e'], ['#1a0533', '#6a0572'],
  ['#0f3460', '#533483'], ['#16213e', '#e94560'], ['#1b1b2f', '#e43f5a'],
  ['#162447', '#1f4068'], ['#2c003e', '#5c0099'],
]
function coverGradient(title = '') {
  const i = [...title].reduce((a, c) => a + c.charCodeAt(0), 0) % GRADIENTS.length
  const [a, b] = GRADIENTS[i]
  return `linear-gradient(135deg, ${a}, ${b})`
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth()

  const [myChannels]    = useState(() => loadLS('pulse_my_channels'))
  const [trackedRivals] = useState(() => loadLS('pulse_tracked_rivals'))

  const [picks, setPicks]         = useState(null)
  const [picksLoading, setPicksL] = useState(true)

  const [activity,    setActivity]  = useState(null)
  const [actLoading,  setActL]      = useState(false)
  const [activeVideo, setActiveVideo] = useState(null) // in-app player

  const [actedIds, setActedIds] = useState(new Set())

  useEffect(() => {
    pulse.today()
      .then(d => setPicks(d?.picks ?? []))
      .catch(() => setPicks([]))
      .finally(() => setPicksL(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadActivity = useCallback(async () => {
    if (!trackedRivals.length) { setActivity([]); return }
    setActL(true)
    try {
      const ids = trackedRivals.map(r => r.channelId).join(',')
      const d = await rivals.activity(ids)
      setActivity(d?.videos ?? [])
    } catch {
      // API not deployed — fall back to YouTube RSS
      try {
        const videos = await fetchYouTubeRSS(trackedRivals)
        setActivity(videos)
      } catch {
        setActivity([])
      }
    } finally {
      setActL(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadActivity() }, [loadActivity])

  function handlePickAction(id, action) {
    pulse.act(id, action).catch(() => {})
    setActedIds(prev => new Set([...prev, id]))
  }

  const visiblePicks = (picks ?? []).filter(p => !actedIds.has(p.id)).slice(0, 5)
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="screen">

      {/* ── Greeting ── */}
      <div style={{ padding: '28px 20px 8px' }}>
        <div style={{
          fontSize: 11, color: 'var(--gray)', fontWeight: 600,
          marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.6px',
        }}>
          {today}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
          {greeting(user)} 👋
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          Here's what's happening in your niche today.
        </div>
      </div>

      {/* ── Stats line ── */}
      <div style={{
        display: 'flex', gap: 14, padding: '12px 20px 20px',
        fontSize: 13, color: 'var(--muted)',
      }}>
        <Link to="/pulse/profile" style={{ color: 'inherit', textDecoration: 'none' }}>
          <strong style={{ color: 'var(--light)' }}>{myChannels.length}</strong> channels
        </Link>
        <span style={{ color: 'var(--border)' }}>·</span>
        <Link to="/pulse/competitors" style={{ color: 'inherit', textDecoration: 'none' }}>
          <strong style={{ color: 'var(--light)' }}>{trackedRivals.length}</strong> competitors
        </Link>
        <span style={{ color: 'var(--border)' }}>·</span>
        <Link to="/pulse/today" style={{ color: 'inherit', textDecoration: 'none' }}>
          <strong style={{ color: 'var(--light)' }}>{picksLoading ? '…' : (picks?.length ?? 0)}</strong> picks
        </Link>
      </div>

      <div style={{ padding: '0 16px', paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Getting-started guide (fresh users only) ── */}
        {myChannels.length === 0 && trackedRivals.length === 0 && (
          <GettingStartedCard />
        )}

        {/* ── My Channels ── */}
        <Section title="My Channels" linkTo="/pulse/profile" linkLabel="Manage">
          {myChannels.length === 0 ? (
            <Link
              to="/pulse/profile"
              style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}
            >
              + Link your first channel →
            </Link>
          ) : (
            <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 2 }}>
              {myChannels.map((ch, i) => (
                <ChannelChip key={ch.channelId} channel={ch} isPrimary={i === 0} />
              ))}
              <Link to="/pulse/profile" style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 52,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'var(--surface2)', border: '2px dashed var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontSize: 18, color: 'var(--gray)', lineHeight: 1 }}>+</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--gray)', fontWeight: 600 }}>Add</div>
                </div>
              </Link>
            </div>
          )}
        </Section>

        {/* ── Today's Picks ── */}
        <Section title="Today's Picks" linkTo="/pulse/today" linkLabel="See all">
          {picksLoading ? (
            <Spinner />
          ) : visiblePicks.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--gray)', padding: '4px 0' }}>
              {picks?.length
                ? <>All picks actioned — <Link to="/pulse/today" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>see full list →</Link></>
                : <>No picks yet — <Link to="/pulse/today" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>check back later →</Link></>
              }
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visiblePicks.map((pick, i) => (
                <HomePickRow key={pick.id} pick={pick} rank={i + 1} onAction={handlePickAction} />
              ))}
            </div>
          )}
        </Section>

        {/* ── Competitor Activity ── */}
        <Section
          title="Competitor Activity"
          linkTo="/pulse/competitors"
          linkLabel="See all"
          onRefresh={trackedRivals.length ? loadActivity : null}
          refreshing={actLoading}
        >
          {actLoading ? (
            <Spinner />
          ) : !trackedRivals.length ? (
            <div style={{
              background: 'var(--surface)', borderRadius: 'var(--radius)',
              border: '1px solid var(--border)', padding: '20px 16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            }}>
              <div style={{ fontSize: 28 }}>📡</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--light)' }}>No competitors tracked yet</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.5 }}>
                Track competitor channels to see when they post and what's trending in your niche.
              </div>
              <Link
                to="/pulse/competitors"
                style={{
                  fontSize: 13, fontWeight: 700, color: '#fff',
                  background: 'var(--primary)', padding: '9px 20px',
                  borderRadius: 'var(--radius-sm)', textDecoration: 'none',
                }}
              >
                Find competitors →
              </Link>
            </div>
          ) : !activity?.length ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--gray)' }}>No recent posts found</div>
              <button
                onClick={loadActivity}
                style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', background: 'none', padding: 0 }}
              >
                Retry
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activity.slice(0, 5).map(v => (
                <ActivityRow key={v.videoId} video={v} onPlay={setActiveVideo} />
              ))}
              {activity.length > 5 && (
                <Link
                  to="/pulse/competitors"
                  style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none', paddingTop: 2 }}
                >
                  + {activity.length - 5} more posts →
                </Link>
              )}
            </div>
          )}
        </Section>

        {/* ── Tracked Rivals ── */}
        {trackedRivals.length > 0 && (
          <Section
            title={`Tracked Competitors · ${trackedRivals.length}`}
            linkTo="/pulse/competitors"
            linkLabel="Manage"
          >
            <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 2 }}>
              {trackedRivals.slice(0, 8).map(r => (
                <RivalChip key={r.channelId} rival={r} />
              ))}
              {trackedRivals.length > 8 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 52,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: 'var(--surface2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: 'var(--gray)', flexShrink: 0,
                  }}>
                    +{trackedRivals.length - 8}
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ── Competitive edge callout ── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,59,59,0.12), rgba(29,185,84,0.08))',
          borderRadius: 'var(--radius)', border: '1px solid var(--border)',
          padding: '18px 16px',
          display: 'flex', gap: 14, alignItems: 'flex-start',
        }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🏆</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
              Stay ahead of your competitors
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
              Post trending songs before your competitors do. Check <strong>Today's Picks</strong> daily
              and watch the <strong>Competitor Activity</strong> feed to spot what's gaining traction.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Link
                to="/pulse/today"
                style={{
                  fontSize: 12, fontWeight: 700, color: '#fff',
                  background: 'var(--primary)', padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)', textDecoration: 'none',
                }}
              >
                Today's Picks
              </Link>
              <Link
                to="/pulse/competitors"
                style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--light)',
                  background: 'var(--surface2)', padding: '7px 14px',
                  borderRadius: 'var(--radius-sm)', textDecoration: 'none',
                }}
              >
                Competitors
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* In-app video player */}
      {activeVideo && (
        <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />
      )}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, linkTo, linkLabel, onRefresh, refreshing, children }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.8px', color: 'var(--gray)',
          }}>
            {title}
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh"
              style={{
                background: 'none', border: 'none', padding: 2,
                color: 'var(--gray)', cursor: 'pointer',
                opacity: refreshing ? 0.4 : 1,
              }}
            >
              <RefreshCw size={12} strokeWidth={2} className={refreshing ? 'spin' : ''} />
            </button>
          )}
        </div>
        {linkTo && linkLabel && (
          <Link to={linkTo} style={{
            display: 'flex', alignItems: 'center', gap: 2,
            fontSize: 12, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none',
          }}>
            {linkLabel} <ChevronRight size={13} strokeWidth={2.5} />
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

// ── Channel chip ──────────────────────────────────────────────────────────────

function ChannelChip({ channel: ch, isPrimary }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 64,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'var(--surface2)', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: isPrimary ? '2px solid var(--primary)' : '2px solid transparent',
        flexShrink: 0,
      }}>
        {ch.thumbnail_url
          ? <img src={ch.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Tv size={18} color="var(--gray)" />
        }
      </div>
      <div style={{
        fontSize: 10, fontWeight: 600, color: isPrimary ? 'var(--light)' : 'var(--muted)',
        textAlign: 'center', maxWidth: 68,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {ch.channelName}
      </div>
    </div>
  )
}

// ── Rival chip ────────────────────────────────────────────────────────────────

function RivalChip({ rival: r }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 52,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'var(--surface2)', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, fontWeight: 700, flexShrink: 0,
      }}>
        {r.thumbnail_url
          ? <img src={r.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (r.name?.[0] ?? '?')
        }
      </div>
      <div style={{
        fontSize: 10, fontWeight: 600, color: 'var(--gray)',
        textAlign: 'center', maxWidth: 56,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {r.name}
      </div>
    </div>
  )
}

// ── Home pick row ─────────────────────────────────────────────────────────────

function HomePickRow({ pick, rank, onAction }) {
  const [coverFailed, setCoverFailed] = useState(false)
  const showCover = pick.cover && !coverFailed

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
    }}>
      {/* Cover */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {showCover ? (
          <img
            src={pick.cover}
            alt=""
            onError={() => setCoverFailed(true)}
            style={{ width: 44, height: 44, borderRadius: 7, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: 44, height: 44, borderRadius: 7,
            background: coverGradient(pick.title),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Music2 size={16} strokeWidth={1.5} color="rgba(255,255,255,0.6)" />
          </div>
        )}
        <div style={{
          position: 'absolute', top: -5, left: -5,
          width: 16, height: 16, borderRadius: '50%',
          background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, fontWeight: 800, color: '#fff',
        }}>
          {rank}
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          marginBottom: 4,
        }}>
          {pick.title}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {pick.peerCount >= 2 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 10, fontWeight: 700, color: '#ff9500',
              background: 'rgba(255,149,0,0.12)', padding: '2px 6px', borderRadius: 100,
            }}>
              <Flame size={9} strokeWidth={2} /> {pick.peerCount} peers
            </span>
          )}
          {pick.viewsPerHour && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 10, fontWeight: 700, color: 'var(--secondary)',
              background: 'rgba(29,185,84,0.12)', padding: '2px 6px', borderRadius: 100,
            }}>
              <TrendingUp size={9} strokeWidth={2} /> {fmtK(pick.viewsPerHour)}/hr
            </span>
          )}
          {pick.chartRank && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 10, fontWeight: 700, color: '#ffd700',
              background: 'rgba(255,215,0,0.12)', padding: '2px 6px', borderRadius: 100,
            }}>
              <Trophy size={9} strokeWidth={2} /> #{pick.chartRank}
            </span>
          )}
          {!pick.peerCount && !pick.viewsPerHour && !pick.chartRank && (
            <span style={{ fontSize: 11, color: 'var(--gray)' }}>{pick.artist}</span>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => onAction(pick.id, 'posted')}
          title="Post it"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, borderRadius: 'var(--radius-sm)',
            background: 'var(--secondary)', color: '#fff',
          }}
        >
          <Check size={13} strokeWidth={2.5} />
        </button>
        <button
          onClick={() => onAction(pick.id, 'skipped')}
          title="Skip"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, borderRadius: 'var(--radius-sm)',
            background: 'var(--surface2)', color: 'var(--gray)',
          }}
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

// ── Activity row ──────────────────────────────────────────────────────────────

function ActivityRow({ video: v, onPlay }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={() => onPlay(v)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--surface2)' : 'var(--surface)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        display: 'flex', gap: 10, padding: '10px 12px',
        alignItems: 'center', cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {v.thumbnail ? (
          <img
            src={v.thumbnail}
            alt=""
            style={{ width: 72, height: 42, borderRadius: 5, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: 72, height: 42, borderRadius: 5, background: 'var(--surface2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Play size={14} color="var(--gray)" />
          </div>
        )}
        {/* Play overlay on hover */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 5,
          background: 'rgba(0,0,0,0.45)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
        }}>
          <Play size={16} color="#fff" fill="#fff" />
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>
          {v.channelName}
        </div>
        <div style={{
          fontSize: 12, fontWeight: 600, color: 'var(--light)', lineHeight: 1.35,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {v.title}
        </div>
        {v.views > 0 && (
          <div style={{ fontSize: 10, color: 'var(--secondary)', fontWeight: 700, marginTop: 2 }}>
            👁 {fmtK(v.views)} views
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--gray)', flexShrink: 0, whiteSpace: 'nowrap' }}>
        {timeAgo(v.publishedAt)}
      </div>
    </div>
  )
}

// ── Video modal ───────────────────────────────────────────────────────────────

function VideoModal({ video, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      {/* Title bar */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 640,
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 8,
        }}
      >
        <div style={{
          flex: 1, fontSize: 13, fontWeight: 700, color: '#fff',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {video.title}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.12)', border: 'none',
            color: '#fff', borderRadius: '50%',
            width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <X size={15} strokeWidth={2.5} />
        </button>
      </div>

      {/* Player */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 640,
          aspectRatio: '16/9',
          borderRadius: 10, overflow: 'hidden',
          background: '#000',
        }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0`}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          title={video.title}
        />
      </div>

      {/* Channel name */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}
      >
        {video.channelName}
      </div>
    </div>
  )
}

// ── Getting-started card (shown to brand-new users) ──────────────────────────

const SETUP_STEPS = [
  {
    icon: UserCircle,
    title: 'Link your channel',
    body:  'Connect your YouTube channel so we can find competitors in your niche.',
    cta:   'Go to Profile →',
    to:    '/pulse/profile',
    done:  false, // checked dynamically
  },
  {
    icon: Swords,
    title: 'Track competitors',
    body:  'Add channels you compete with. We\'ll monitor when they post.',
    cta:   'Find Competitors →',
    to:    '/pulse/competitors',
  },
  {
    icon: Music2,
    title: 'Get daily picks',
    body:  'Once competitors are tracked, your personalised song picks generate automatically.',
    cta:   'See Today\'s Picks →',
    to:    '/pulse/today',
  },
]

function GettingStartedCard() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,59,59,0.07), rgba(99,102,241,0.05))',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '20px 16px',
    }}>
      <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 3 }}>👋 Welcome to Pulse</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55, marginBottom: 18 }}>
        3 quick steps to start tracking competitors and getting daily song picks.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {SETUP_STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <Link
              key={i}
              to={step.to}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                padding: '12px 14px',
                transition: 'border-color 0.15s',
              }}>
                {/* Step number + icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--surface2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <Icon size={16} strokeWidth={1.75} color="var(--primary)" />
                  <div style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'var(--surface2)', border: '1.5px solid var(--border)',
                    fontSize: 9, fontWeight: 800, color: 'var(--gray)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {i + 1}
                  </div>
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--light)', marginBottom: 2 }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45, marginBottom: 6 }}>
                    {step.body}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
                    {step.cta}
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
      <div className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { pulse, rivals } from '../api'
import {
  Tv, Flame, TrendingUp, Trophy, ChevronRight,
  Music2, Play, Check, X, Users, BarChart2,
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

  const [activity, setActivity]   = useState(null)
  const [actLoading, setActL]     = useState(false)

  const [actedIds, setActedIds]   = useState(new Set())

  useEffect(() => {
    pulse.today()
      .then(d => setPicks(d?.picks ?? []))
      .catch(() => setPicks([]))
      .finally(() => setPicksL(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!trackedRivals.length) { setActivity([]); return }
    setActL(true)
    const ids = trackedRivals.map(r => r.channelId).join(',')
    rivals.activity(ids)
      .then(d => setActivity(d?.videos ?? []))
      .catch(() => setActivity([]))
      .finally(() => setActL(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePickAction(id, action) {
    pulse.act(id, action).catch(() => {})
    setActedIds(prev => new Set([...prev, id]))
  }

  const visiblePicks = (picks ?? []).filter(p => !actedIds.has(p.id)).slice(0, 3)
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

      {/* ── Stats bar ── */}
      <div style={{ display: 'flex', gap: 10, padding: '16px 20px 20px' }}>
        <StatCard
          icon={<Tv size={16} strokeWidth={1.75} />}
          label="Channels"
          value={myChannels.length}
          linkTo="/pulse/profile"
        />
        <StatCard
          icon={<Users size={16} strokeWidth={1.75} />}
          label="Competitors"
          value={trackedRivals.length}
          color="var(--primary)"
          linkTo="/pulse/competitors"
        />
        <StatCard
          icon={<BarChart2 size={16} strokeWidth={1.75} />}
          label="Picks"
          value={picksLoading ? '…' : (picks?.length ?? 0)}
          color="var(--secondary)"
          linkTo="/pulse/today"
        />
      </div>

      <div style={{ padding: '0 16px', paddingBottom: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>

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
        <Section title="Competitor Activity" linkTo="/pulse/competitors" linkLabel="See all">
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
            <div style={{ fontSize: 13, color: 'var(--gray)', padding: '4px 0' }}>
              No recent activity from your competitors
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activity.slice(0, 4).map(v => (
                <ActivityRow key={v.videoId} video={v} />
              ))}
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
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, linkTo, linkLabel, children }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 10,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.8px', color: 'var(--gray)',
        }}>
          {title}
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

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color = 'var(--light)', linkTo }) {
  const content = (
    <div style={{
      flex: 1, background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)', padding: '12px 10px',
      display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center',
    }}>
      <div style={{ color: 'var(--gray)' }}>{icon}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{
        fontSize: 10, color: 'var(--gray)', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>
        {label}
      </div>
    </div>
  )
  return linkTo
    ? <Link to={linkTo} style={{ flex: 1, textDecoration: 'none' }}>{content}</Link>
    : content
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

function ActivityRow({ video: v }) {
  return (
    <a
      href={`https://youtube.com/watch?v=${v.videoId}`}
      target="_blank"
      rel="noreferrer"
      style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        display: 'flex', gap: 10, padding: '10px 12px',
        textDecoration: 'none', alignItems: 'center',
      }}
    >
      {v.thumbnail ? (
        <img
          src={v.thumbnail}
          alt=""
          style={{ width: 72, height: 42, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 72, height: 42, borderRadius: 5, background: 'var(--surface2)',
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Play size={14} color="var(--gray)" />
        </div>
      )}
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
      </div>
      <div style={{ fontSize: 11, color: 'var(--gray)', flexShrink: 0, whiteSpace: 'nowrap' }}>
        {timeAgo(v.publishedAt)}
      </div>
    </a>
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

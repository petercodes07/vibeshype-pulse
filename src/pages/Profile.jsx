import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { auth, pulse } from '../api'
import { Mail, AtSign, Check, X, Tv, Film, Globe, Clock, Plus, Trash2 } from 'lucide-react'

const KEY_MY_CHANNELS = 'pulse_my_channels'

function loadMyChannels() {
  try { return JSON.parse(localStorage.getItem(KEY_MY_CHANNELS) || 'null') ?? [] }
  catch { return [] }
}
function saveMyChannels(list) {
  localStorage.setItem(KEY_MY_CHANNELS, JSON.stringify(list))
}

function initials(user) {
  if (user?.username) return user.username[0].toUpperCase()
  if (user?.email) return user.email[0].toUpperCase()
  return '?'
}

export default function Profile() {
  const { user } = useAuth()

  const [editingUsername, setEditingUsername] = useState(false)
  const [usernameVal,     setUsernameVal]     = useState(user?.username ?? '')
  const [usernameError,   setUsernameError]   = useState(null)
  const [saving,          setSaving]          = useState(false)
  const [saved,           setSaved]           = useState(false)

  // Channels the user has linked
  const [myChannels,      setMyChannels]      = useState(() => loadMyChannels())
  const [profileLoading,  setProfileLoading]  = useState(true)

  // Add-channel form
  const [addingChannel,   setAddingChannel]   = useState(false)
  const [newChannelUrl,   setNewChannelUrl]   = useState('')
  const [addLoading,      setAddLoading]      = useState(false)
  const [addError,        setAddError]        = useState(null)
  const [addPreview,      setAddPreview]      = useState(null)  // Phase 1 channel preview

  const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

  // On mount: seed from pulse.profile() if the list is empty
  useEffect(() => {
    if (myChannels.length > 0) { setProfileLoading(false); return }
    pulse.profile()
      .then(data => {
        if (data?.channelId) {
          const entry = {
            channelId:    data.channelId,
            channelName:  data.channelName  ?? 'My Channel',
            thumbnail_url:data.thumbnail_url ?? null,
            format:       data.format       ?? null,
            genres:       data.genres       ?? [],
            languages:    data.languages    ?? [],
            avgDuration:  data.avgDuration  ?? 0,
          }
          setMyChannels([entry])
          saveMyChannels([entry])
          localStorage.setItem('pulse_channel_id', data.channelId)
        }
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function saveUsername() {
    setUsernameError(null)
    if (!USERNAME_RE.test(usernameVal)) {
      setUsernameError('3–20 chars, letters, numbers, underscores only.')
      return
    }
    setSaving(true)
    try {
      await auth.updateMe({ username: usernameVal })
      setEditingUsername(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setUsernameError(
        err.status === 409 ? 'That username is already taken.' : 'Could not save. Try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  function cancelUsername() {
    setUsernameVal(user?.username ?? '')
    setUsernameError(null)
    setEditingUsername(false)
  }

  async function handleAddChannel() {
    const url = newChannelUrl.trim()
    if (!url) return
    setAddLoading(true)
    setAddError(null)
    setAddPreview(null)
    try {
      // ── Phase 1: fast resolve (<1 s) ──────────────────────────────────────
      const phase1 = await pulse.onboard(url)

      if (phase1.analysisId) {
        // Show channel info immediately, then poll Phase 2
        setAddPreview(phase1.channel ?? null)

        const phase2 = await pollAddChannel(phase1.analysisId)
        const p = phase2?.profile
        if (!p?.channelId) throw new Error('No channel ID returned')
        commitChannel(p, url)
      } else {
        // Legacy single-phase
        const p = phase1?.profile
        if (!p?.channelId) throw new Error('No channel ID returned')
        commitChannel(p, url)
      }
    } catch (err) {
      if (err.message === 'duplicate') {
        setAddError('This channel is already linked.')
      } else {
        setAddError('Could not find that channel. Check the URL and try again.')
      }
    } finally {
      setAddLoading(false)
      setAddPreview(null)
    }
  }

  /** Poll /onboard/:id/status until complete. Returns completed data. */
  function pollAddChannel(analysisId, timeoutMs = 90_000) {
    return new Promise((resolve, reject) => {
      const deadline = setTimeout(() => {
        clearInterval(iv)
        reject(new Error('Analysis timed out'))
      }, timeoutMs)

      const iv = setInterval(async () => {
        try {
          const data = await pulse.onboardStatus(analysisId)
          if (data.status === 'complete') {
            clearInterval(iv); clearTimeout(deadline)
            resolve(data)
          } else if (data.status === 'failed') {
            clearInterval(iv); clearTimeout(deadline)
            reject(new Error(data.error || 'Analysis failed'))
          }
        } catch { /* keep retrying */ }
      }, 3000)
    })
  }

  function commitChannel(p, url) {
    if (myChannels.some(c => c.channelId === p.channelId)) {
      throw new Error('duplicate')
    }
    const entry = {
      channelId:    p.channelId,
      channelName:  p.channelName   ?? url,
      thumbnail_url:p.thumbnail_url ?? null,
      format:       p.format        ?? null,
      genres:       p.genres        ?? [],
      languages:    p.languages     ?? [],
      avgDuration:  p.avgDuration   ?? 0,
    }
    const next = [...myChannels, entry]
    setMyChannels(next)
    saveMyChannels(next)
    if (next.length === 1) localStorage.setItem('pulse_channel_id', p.channelId)
    setNewChannelUrl('')
    setAddingChannel(false)
  }

  function removeChannel(channelId) {
    const next = myChannels.filter(c => c.channelId !== channelId)
    setMyChannels(next)
    saveMyChannels(next)
    if (localStorage.getItem('pulse_channel_id') === channelId) {
      localStorage.setItem('pulse_channel_id', next[0]?.channelId ?? '')
    }
  }

  return (
    <div className="screen">

      {/* ── Hero ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '32px 24px 24px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 800, color: '#fff', flexShrink: 0,
        }}>
          {initials(user)}
        </div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px' }}>
            {user?.username ?? user?.email?.split('@')[0] ?? 'Your account'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{user?.email}</div>
        </div>
      </div>

      <div style={{ padding: '0 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* ── Account ── */}
        <SectionLabel label="Account" />

        <InfoRow icon={<AtSign size={15} strokeWidth={1.75} />} label="Username">
          {editingUsername ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                value={usernameVal}
                onChange={e => setUsernameVal(e.target.value.replace(/\s/g, ''))}
                maxLength={20}
                autoFocus
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--light)', fontSize: 14, fontFamily: 'inherit' }}
              />
              {usernameError && <div style={{ fontSize: 11, color: '#ff7070', marginTop: 3 }}>{usernameError}</div>}
            </div>
          ) : (
            <span style={{ flex: 1, fontSize: 14, color: user?.username ? 'var(--light)' : 'var(--gray)' }}>
              {user?.username ?? 'Not set'}
              {saved && <span style={{ fontSize: 11, color: 'var(--secondary)', marginLeft: 8 }}>Saved ✓</span>}
            </span>
          )}
          {editingUsername ? (
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={saveUsername} disabled={saving} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', background: 'var(--secondary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={13} strokeWidth={2.5} />
              </button>
              <button onClick={cancelUsername} style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={13} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingUsername(true)} style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, flexShrink: 0 }}>Edit</button>
          )}
        </InfoRow>

        <InfoRow icon={<Mail size={15} strokeWidth={1.75} />} label="Email">
          <span style={{ flex: 1, fontSize: 14, color: 'var(--light)' }}>{user?.email}</span>
          {user?.emailVerified && (
            <span style={{ fontSize: 11, color: 'var(--secondary)', fontWeight: 600, background: 'rgba(29,185,84,0.12)', padding: '3px 8px', borderRadius: 100, flexShrink: 0 }}>Verified</span>
          )}
        </InfoRow>

        {/* ── Your Channels ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 2 }}>
          <SectionLabel label="Your Channels" inline />
          {!addingChannel && (
            <button
              onClick={() => { setAddingChannel(true); setAddError(null); setNewChannelUrl('') }}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}
            >
              <Plus size={13} strokeWidth={2.5} /> Add channel
            </button>
          )}
        </div>

        {/* Add channel form */}
        {addingChannel && (
          addLoading ? (
            <div style={{
              background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)',
              padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
            }}>
              {/* Show channel preview as soon as Phase 1 returns */}
              {addPreview && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--surface2)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--primary)' }}>
                    {addPreview.thumbnail_url
                      ? <img src={addPreview.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Tv size={16} color="var(--gray)" />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {addPreview.channelName}
                    </div>
                    {addPreview.subs && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{addPreview.subs} subscribers</div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--secondary)', background: 'rgba(29,185,84,0.12)', padding: '3px 8px', borderRadius: 100, flexShrink: 0 }}>
                    ✓ Found
                  </span>
                </div>
              )}
              <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>
                  {addPreview ? 'Analysing content…' : 'Checking channel…'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {addPreview
                    ? <>Finding competitor channels in your niche.<br />This takes 20–40 seconds.</>
                    : 'Verifying channel URL…'
                  }
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--primary)', opacity: 0.3,
                    animation: `pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Connect a YouTube channel</div>
              <div className="input-wrap" style={{ marginBottom: 0 }}>
                <input
                  type="url"
                  placeholder="https://youtube.com/@yourchannel"
                  value={newChannelUrl}
                  onChange={e => setNewChannelUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddChannel()}
                  autoFocus
                />
                <span className="input-icon" style={{ left: 12 }}><Tv size={14} strokeWidth={1.75} /></span>
              </div>
              {addError && <div style={{ fontSize: 12, color: '#ff7070' }}>{addError}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleAddChannel}
                  disabled={!newChannelUrl.trim()}
                  style={{ flex: 2, padding: '10px 0', borderRadius: 'var(--radius-sm)', background: 'var(--primary)', color: '#fff', fontWeight: 700, fontSize: 13, opacity: !newChannelUrl.trim() ? 0.4 : 1 }}
                >
                  Connect →
                </button>
                <button
                  onClick={() => { setAddingChannel(false); setAddError(null) }}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', color: 'var(--gray)', fontWeight: 600, fontSize: 13 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )
        )}

        {/* Channel list */}
        {profileLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
            <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
          </div>
        ) : myChannels.length > 0 ? (
          myChannels.map((ch, i) => (
            <ChannelCard
              key={ch.channelId}
              channel={ch}
              isPrimary={i === 0}
              onRemove={() => removeChannel(ch.channelId)}
            />
          ))
        ) : null}

        <div style={{ height: 24 }} />
      </div>
    </div>
  )
}

// ── Channel card ──────────────────────────────────────────────────────────────

function ChannelCard({ channel: ch, isPrimary, onRemove }) {
  const mins = ch.avgDuration ? Math.floor(ch.avgDuration / 60) : null
  const secs = ch.avgDuration ? ch.avgDuration % 60 : null

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface2)', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {ch.thumbnail_url
            ? <img src={ch.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Tv size={18} color="var(--gray)" />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {ch.channelName}
            </div>
            {isPrimary && (
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--secondary)', background: 'rgba(29,185,84,0.12)', padding: '2px 7px', borderRadius: 100, flexShrink: 0 }}>
                Primary
              </span>
            )}
          </div>
          <a href={`https://youtube.com/channel/${ch.channelId}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--primary)', marginTop: 2, display: 'block' }}>
            View on YouTube ↗
          </a>
        </div>
        <button
          onClick={onRemove}
          title="Remove"
          style={{ width: 30, height: 30, borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', color: 'var(--gray)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
        >
          <Trash2 size={13} strokeWidth={2} />
        </button>
      </div>

      {/* Meta chips */}
      {(ch.format || ch.languages?.length || ch.genres?.length || mins != null) && (
        <>
          <div style={{ height: 1, background: 'var(--border)' }} />
          <div style={{ padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ch.format && <MetaChip icon={<Film size={11} />}>{ch.format}</MetaChip>}
            {ch.languages?.map(l => <MetaChip key={l} icon={<Globe size={11} />}>{l}</MetaChip>)}
            {mins != null && <MetaChip icon={<Clock size={11} />}>avg {mins}m{secs ? ` ${secs}s` : ''}</MetaChip>}
            {ch.genres?.map(g => <MetaChip key={g}>{g}</MetaChip>)}
          </div>
        </>
      )}
    </div>
  )
}

function MetaChip({ icon, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 100, background: 'var(--surface2)', fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
      {icon}{children}
    </span>
  )
}

// ── Shared ────────────────────────────────────────────────────────────────────

function SectionLabel({ label, inline = false }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--gray)', ...(inline ? {} : { marginTop: 10, marginBottom: 2 }) }}>
      {label}
    </div>
  )
}

function InfoRow({ icon, label, children }) {
  return (
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ color: 'var(--gray)', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>
      </div>
    </div>
  )
}

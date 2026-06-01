/**
 * ActiveChannelContext
 *
 * Provides the currently selected channel and a switcher across the whole app.
 * Reads from / writes to the same localStorage keys Profile.jsx already maintains:
 *   pulse_my_channels  — [{ channelId, channelName, thumbnail_url }]
 *   pulse_channel_id   — active channel ID
 *
 * All four data pages (PulseToday, PulseHistory, Rivals, PulsePeers) consume
 * useActiveChannel() and re-fetch when activeChannel.channelId changes.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const KEY_CHANNELS  = 'pulse_my_channels'
const KEY_ACTIVE_ID = 'pulse_channel_id'

function readChannels() {
  try { return JSON.parse(localStorage.getItem(KEY_CHANNELS) || 'null') ?? [] }
  catch { return [] }
}

const Ctx = createContext(null)

export function ActiveChannelProvider({ children }) {
  const [channels, setChannels] = useState(readChannels)
  const [activeId, setActiveId] = useState(
    () => localStorage.getItem(KEY_ACTIVE_ID) ?? readChannels()[0]?.channelId ?? null
  )

  // Stay in sync when Profile.jsx writes to localStorage (storage event fires
  // for cross-tab changes; same-tab mutations go through setActiveChannel below)
  useEffect(() => {
    function onStorage(e) {
      if (e.key === KEY_CHANNELS)  setChannels(readChannels())
      if (e.key === KEY_ACTIVE_ID) setActiveId(localStorage.getItem(KEY_ACTIVE_ID))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setActiveChannel = useCallback((ch) => {
    localStorage.setItem(KEY_ACTIVE_ID, ch.channelId)
    setActiveId(ch.channelId)
  }, [])

  const activeChannel = channels.find(c => c.channelId === activeId) ?? channels[0] ?? null

  return (
    <Ctx.Provider value={{ activeChannel, channels, setActiveChannel }}>
      {children}
    </Ctx.Provider>
  )
}

export function useActiveChannel() {
  const ctx = useContext(Ctx)
  if (!ctx) return { activeChannel: null, channels: [], setActiveChannel: () => {} }
  return ctx
}

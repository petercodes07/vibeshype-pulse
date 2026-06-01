/**
 * Post queue — stores scheduled picks keyed by ISO date in localStorage.
 * Schema (key: 'pulse_queue'):
 *   { [isoDate]: [{ id, title, artist, cover }] }
 */

const KEY = 'pulse_queue'

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} }
}

function write(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
}

/** Add a pick to a day. Dedupes by pick.id. */
export function saveQueueItem(isoDate, pick) {
  const data = read()
  const day = data[isoDate] ?? []
  if (!day.find(p => p.id === pick.id)) {
    day.push({ id: pick.id, title: pick.title, artist: pick.artist, cover: pick.cover ?? null })
  }
  data[isoDate] = day
  write(data)
}

/** All picks scheduled for a given day. */
export function getQueueForDay(isoDate) {
  return read()[isoDate] ?? []
}

/** All picks for the 7 days starting at weekStartIso (YYYY-MM-DD). */
export function getQueueForWeek(weekStartIso) {
  const data = read()
  const result = {}
  for (let i = 0; i < 7; i++) {
    const d = offsetDate(weekStartIso, i)
    result[d] = data[d] ?? []
  }
  return result
}

/** Remove a single pick from a day. */
export function removeQueueItem(isoDate, pickId) {
  const data = read()
  if (data[isoDate]) {
    data[isoDate] = data[isoDate].filter(p => p.id !== pickId)
    if (!data[isoDate].length) delete data[isoDate]
  }
  write(data)
}

/** Remove all picks from a day. */
export function clearDay(isoDate) {
  const data = read()
  delete data[isoDate]
  write(data)
}

/** YYYY-MM-DD of the Monday of the week containing the given date. */
export function getMondayOf(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()               // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toIso(d)
}

/** Offset a YYYY-MM-DD string by n days. */
export function offsetDate(isoDate, n) {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toIso(d)
}

export function toIso(date) {
  return date.toISOString().slice(0, 10)
}

export function formatDayLabel(isoDate) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

export function isToday(isoDate) {
  return isoDate === toIso(new Date())
}

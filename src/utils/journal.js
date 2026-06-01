/**
 * Pick journal — stores per-pick notes and variant tags in localStorage.
 * Schema (key: 'pulse_journal'):
 *   { [pickId]: { note: string, variant: string, savedAt: string } }
 */

const KEY = 'pulse_journal'

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} }
}

function write(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
}

export function saveEntry(pickId, note, variant) {
  const data = read()
  data[pickId] = { note: note.trim(), variant, savedAt: new Date().toISOString() }
  write(data)
}

export function getEntry(pickId) {
  return read()[pickId] ?? null
}

export function getAllEntries() {
  return read()
}

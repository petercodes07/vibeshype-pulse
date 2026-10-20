import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export function createSqlitePool(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true })
  const db = new DatabaseSync(filename)
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;')
  db.exec(readFileSync(new URL('./schema.sqlite.sql', import.meta.url), 'utf8'))

  async function query(sql, params = []) {
    const values = []
    // Expand repeated/out-of-order PostgreSQL placeholders in their SQL order.
    const statement = sql.replace(/\$(\d+)/g, (_, n) => {
      values.push(params[Number(n) - 1] ?? null)
      return '?'
    }).replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP')
    const stmt = db.prepare(statement)
    if (/^\s*(SELECT|WITH)\b/i.test(statement)) {
      const rows = stmt.all(...values)
      return { rows, rowCount: rows.length }
    }
    const info = stmt.run(...values)
    return { rows: [], rowCount: Number(info.changes) }
  }
  // Serialize transactions so concurrent requests cannot share a transaction.
  let tail = Promise.resolve()
  async function connect() {
    const previous = tail
    let unlock
    tail = new Promise(resolve => { unlock = resolve })
    await previous
    let inTransaction = false
    let released = false
    return {
      async query(sql, params) {
        const command = sql.trim().toUpperCase()
        if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(command)) {
          db.exec(command)
          inTransaction = command === 'BEGIN'
          return { rows: [], rowCount: 0 }
        }
        return query(sql, params)
      },
      release() {
        if (released) return
        released = true
        try { if (inTransaction) db.exec('ROLLBACK') } finally { unlock() }
      },
    }
  }
  return { query, connect, async end() { db.close() } }
}

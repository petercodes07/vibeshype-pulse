import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { pool, databaseKind } from './pool.js'

try {
  if (databaseKind === 'postgres') {
    await pool.query(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'))
  }
  console.log(`[migrate] ${databaseKind} schema ready`)
} catch (err) {
  console.error('[migrate] Failed:', err.message)
  process.exitCode = 1
} finally {
  await pool.end()
}

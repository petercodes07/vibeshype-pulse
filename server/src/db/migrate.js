import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { pool } from './pool.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8')

console.log('[migrate] Running schema...')
try {
  await pool.query(sql)
  console.log('[migrate] Done.')
} catch (err) {
  console.error('[migrate] Failed:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}

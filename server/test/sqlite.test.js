import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSqlitePool } from '../src/db/sqlite.js'

test('portable SQLite supports channel upserts, videos, and rollback', async () => {
  const pool = createSqlitePool(':memory:')
  try {
    const sql = `INSERT INTO channels(id, name) VALUES ($1, $2)
      ON CONFLICT(id) DO UPDATE SET name=$2, fetched_at=NOW()`
    await pool.query(sql, ['channel', 'Original'])
    await pool.query(sql, ['channel', 'Updated'])
    const { rows } = await pool.query('SELECT name FROM channels WHERE id=$1', ['channel'])
    assert.equal(rows[0].name, 'Updated')
    const client = await pool.connect()
    await client.query('BEGIN')
    await client.query('INSERT INTO videos(id, channel_id, title) VALUES ($2,$1,$3)', ['channel', 'video', 'Title'])
    client.release()
    assert.equal((await pool.query('SELECT * FROM videos')).rowCount, 0)
  } finally { await pool.end() }
})

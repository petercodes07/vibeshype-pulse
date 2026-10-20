import 'dotenv/config'

export const databaseKind = process.env.DATABASE_URL ? 'postgres' : 'sqlite'

async function createPool() {
  if (databaseKind === 'postgres') {
    const { default: pg } = await import('pg')
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
    pool.on('error', err => console.error('[db] Unexpected pool error', err.message))
    return pool
  }
  const { createSqlitePool } = await import('./sqlite.js')
  return createSqlitePool(process.env.SQLITE_PATH || './data/pulse.sqlite')
}

export const pool = await createPool()

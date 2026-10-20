import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { youtubeRouter } from './routes/youtube.js'
import { competitorsRouter } from './routes/competitors.js'
import { pulseRouter } from './routes/pulse.js'
import { rivalsRouter } from './routes/rivals.js'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)
const HOST = process.env.HOST || '127.0.0.1'
const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s => s.trim()).filter(Boolean)

app.use(cors({ origin: origins }))
app.use(express.json())

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }))

// Routes
app.use('/api/youtube', youtubeRouter)
app.use('/api/competitors', competitorsRouter)
app.use('/api/pulse', pulseRouter)
app.use('/api/rivals', rivalsRouter)

// Optional single-process web hosting, using the frontend build.
if (process.env.SERVE_WEB === 'true') {
  const webDir = fileURLToPath(new URL('../../dist/', import.meta.url))
  const index = fileURLToPath(new URL('../../dist/index.html', import.meta.url))
  if (!existsSync(index)) throw new Error('Run npm run build before SERVE_WEB=true')
  app.use(express.static(webDir))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(index)
  })
}

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

app.listen(PORT, HOST, () => {
  console.log(`[server] Listening on http://${HOST}:${PORT}`)
})


import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { youtubeRouter } from './routes/youtube.js'
import { competitorsRouter } from './routes/competitors.js'

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (_req, res) => res.json({ ok: true }))

// Routes
app.use('/api/youtube', youtubeRouter)
app.use('/api/competitors', competitorsRouter)

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not found' }))

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`)
})

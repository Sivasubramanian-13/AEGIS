
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config.js'
import cookieParser from 'cookie-parser'

import scanRouter from './routes/scan.js'
import authRouter from './routes/auth.js'
import sheetsRouter from './routes/sheets.js'
import sessionsRouter from './routes/sessions.js'
import { requireAuth } from './middleware/requireAuth.js'

const app = express()

app.use(helmet())

app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

app.use('/api/auth', authRouter)
app.use('/api/prescriptions', requireAuth, scanRouter)
app.use('/api/sheets', requireAuth, sheetsRouter)
app.use('/api/sessions', requireAuth, sessionsRouter)

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'AEGIS backend is running',
    timestamp: new Date().toISOString(),
  })
})

export default app

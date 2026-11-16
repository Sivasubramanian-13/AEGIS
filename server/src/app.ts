
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config.js'

import scanRouter from './routes/scan.js'   
import authRouter from './routes/auth.js'
import sheetsRouter from './routes/sheets.js'

const app = express()

app.use(helmet())

app.use(cors({
  origin: config.clientUrl,
  credentials: true,
}))

app.use(express.json({ limit: '1mb' }))

app.use('/api/auth', authRouter)

app.use('/api/prescriptions', scanRouter)

app.use('/api/sheets', sheetsRouter)

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'AEGIS backend is running',
    timestamp: new Date().toISOString(),
  })
})

export default app

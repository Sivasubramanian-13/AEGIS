
import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  getGoogleAuth,
  setGoogleTokens,
} from '../services/googleSheets.js'

const router = Router()
const pendingStates = new Set<string>()

const tokenPath = path.resolve(
  process.cwd(),
  'data',
  'google-tokens.json'
)

const scopes = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
]

// Start Google login
router.get('/google', (_req, res) => {
  const state = randomBytes(32).toString('hex')
  pendingStates.add(state)

  const authUrl = getGoogleAuth().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state,
  })

  res.redirect(authUrl)
})

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query

    if (error) {
      return res.status(400).send('Google authorization was denied.')
    }

    if (
      typeof state !== 'string' ||
      !pendingStates.has(state) ||
      typeof code !== 'string'
    ) {
      return res.status(400).send(
        'Invalid OAuth state or authorization code.'
      )
    }

    pendingStates.delete(state)

    const auth = getGoogleAuth()
    const { tokens } = await auth.getToken(code)

    // Verify Google identity
    if (!tokens.id_token) {
      return res.status(401).send(
        'Google account verification failed.'
      )
    }

    const ticket = await auth.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    const email = payload?.email

    const allowedEmail = process.env.ALLOWED_GOOGLE_EMAIL

    if (
      !email ||
      !payload?.email_verified ||
      !allowedEmail ||
      email.toLowerCase() !== allowedEmail.toLowerCase()
    ) {
      return res.status(403).send(
        'This Google account is not authorized.'
      )
    }

    // Require refresh token for persistent access
    if (!tokens.refresh_token) {
      return res.status(400).send(
        'Refresh token missing. Please reconnect Google.'
      )
    }

    // Save tokens
    setGoogleTokens(tokens)

    await mkdir(path.dirname(tokenPath), {
      recursive: true,
    })

    await writeFile(
      tokenPath,
      JSON.stringify(tokens, null, 2),
      { mode: 0o600 }
    )

    return res.send(
      'Google account connected successfully. You can close this page.'
    )

  } catch (error) {
    console.error('Google OAuth error:', error)

    return res.status(500).send(
      'Google authentication failed.'
    )
  }
})

export default router

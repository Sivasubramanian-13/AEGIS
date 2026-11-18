
import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { google } from 'googleapis'
import {
  getGoogleAuth,
  setGoogleTokens,
} from '../services/googleSheets.js'

import {
  createAuthSession,
  validateAuthSession,
  revokeAuthSession,
} from '../services/authSessions.js'

const router = Router()

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

const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production'
    ? 'none' as const
    : 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
}

// Start Google login
router.get('/google', (_req, res) => {
  const state = randomBytes(32).toString('hex')

  res.cookie('aegis_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/api/auth',
  })

  const authUrl = getGoogleAuth().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: scopes,
    state,
  })

  return res.redirect(authUrl)
})

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query
    const savedState = req.cookies?.aegis_oauth_state

    res.clearCookie('aegis_oauth_state', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
    })

    if (error) {
      return res.status(400).send('Google authorization was denied.')
    }

    if (
      typeof state !== 'string' ||
      typeof savedState !== 'string' ||
      state !== savedState ||
      typeof code !== 'string'
    ) {
      return res.status(400).send(
        'Invalid OAuth state or authorization code.'
      )
    }

    const auth = getGoogleAuth()
    const { tokens } = await auth.getToken(code)

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
      !payload?.sub ||
      !email ||
      !payload.email_verified ||
      !allowedEmail ||
      email.toLowerCase() !== allowedEmail.toLowerCase()
    ) {
      return res.status(403).send(
        'This Google account is not authorized.'
      )
    }

    // Save shared Google credentials.
    // Preserve an existing refresh token if Google omits a new one.
    const existingRefreshToken = auth.credentials.refresh_token

    const sharedTokens = {
      ...tokens,
      refresh_token:
        tokens.refresh_token || existingRefreshToken,
    }

    if (!sharedTokens.refresh_token) {
      return res.status(400).send(
        'Refresh token missing. Please reconnect Google.'
      )
    }

    setGoogleTokens(sharedTokens)

    await mkdir(path.dirname(tokenPath), {
      recursive: true,
    })

    await writeFile(
      tokenPath,
      JSON.stringify(sharedTokens, null, 2),
      { mode: 0o600 }
    )

    // Create an independent session for this browser.
    const sessionToken = await createAuthSession(
      payload.sub,
      email
    )

    res.cookie('aegis_session', sessionToken, sessionCookieOptions)

    return res.redirect(
      process.env.CLIENT_URL || 'http://localhost:5173'
    )
  } catch (error) {
    console.error('Google OAuth error:', error)

    return res.status(500).send(
      'Google authentication failed.'
    )
  }
})

// Check current browser session
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.aegis_session

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not signed in',
      })
    }

    const session = await validateAuthSession(token)

    if (!session) {
      res.clearCookie('aegis_session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
      })
    }

    const auth = getGoogleAuth()
    const oauth2 = google.oauth2({ version: 'v2', auth })
    const response = await oauth2.userinfo.get()
    const profile = response.data

    if (
      !profile.email ||
      profile.email.toLowerCase() !== session.email.toLowerCase()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized account',
      })
    }

    return res.json({
      success: true,
      user: {
        name: profile.name,
        email: profile.email,
        picture: profile.picture,
      },
    })
  } catch (error) {
    console.error('Auth check error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to verify session',
    })
  }
})

// Sign out only the current browser
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.aegis_session

    if (token) {
      await revokeAuthSession(token)
    }

    res.clearCookie('aegis_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    })

    return res.json({
      success: true,
      message: 'Signed out from this browser.',
    })
  } catch (error) {
    console.error('Logout error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to sign out.',
    })
  }
})

export default router

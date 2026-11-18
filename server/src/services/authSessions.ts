
import { createHash, randomBytes } from 'node:crypto'
import { pool } from '../lib/db.js'

const SESSION_DURATION_DAYS = 7

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createAuthSession(
  googleSub: string,
  email: string
) {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)

  await pool.query(
    `INSERT INTO auth_sessions
      (token_hash, google_sub, email, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
    [tokenHash, googleSub, email]
  )

  return token
}

export async function validateAuthSession(token: string) {
  const result = await pool.query(
    `SELECT id, google_sub, email
     FROM auth_sessions
     WHERE token_hash = $1
       AND expires_at > NOW()
       AND revoked_at IS NULL`,
    [hashToken(token)]
  )

  return result.rows[0] || null
}

export async function revokeAuthSession(token: string) {
  await pool.query(
    `UPDATE auth_sessions
     SET revoked_at = NOW()
     WHERE token_hash = $1
       AND revoked_at IS NULL`,
    [hashToken(token)]
  )
}

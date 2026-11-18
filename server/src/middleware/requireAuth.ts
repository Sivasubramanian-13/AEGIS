import type { Request, Response, NextFunction } from 'express'
import { validateAuthSession } from '../services/authSessions.js'

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.aegis_session

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      })
    }

    const session = await validateAuthSession(token)

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session expired or invalid.',
      })
    }

    res.locals.authSession = session
    next()
  } catch (error) {
    console.error('Authentication middleware error:', error)

    return res.status(500).json({
      success: false,
      message: 'Authentication verification failed.',
    })
  }
}
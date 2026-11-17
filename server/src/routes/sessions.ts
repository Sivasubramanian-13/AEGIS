
import { Router } from 'express'
import {
  createSession,
  deleteSession,
  getSession,
  getSessions,
  updateSession,
} from '../services/sessions.js'

const router = Router()

// Create a session.
router.post('/', async (req, res) => {
  try {
    const { sheetId, sheetName, totalImages = 0 } = req.body

    if (
      typeof sheetId !== 'string' ||
      !sheetId.trim() ||
      typeof sheetName !== 'string' ||
      !sheetName.trim() ||
      !Number.isInteger(totalImages) ||
      totalImages < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid spreadsheet details are required.',
      })
    }

    const session = await createSession({
      sheetId,
      sheetName,
      totalImages,
    })

    return res.status(201).json({
      success: true,
      session,
    })
  } catch (error) {
    console.error('Create session error:', error)

    return res.status(500).json({
      success: false,
      message: 'Could not create session.',
    })
  }
})

// Update session counts.
router.patch('/:id', async (req, res) => {
  try {
    const allowedFields = [
      'totalImages',
      'saved',
      'needsReview',
      'failed',
    ] as const

    const updates: Partial<
      Record<(typeof allowedFields)[number], number>
    > = {}

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const value = req.body[field]

        if (!Number.isInteger(value) || value < 0) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a non-negative integer.`,
          })
        }

        updates[field] = value
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one session count is required.',
      })
    }

    const session = await updateSession(req.params.id, updates)

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found.',
      })
    }

    return res.json({
      success: true,
      session,
    })
  } catch (error) {
    console.error('Update session error:', error)

    return res.status(500).json({
      success: false,
      message: 'Could not update session.',
    })
  }
})

// Get recent sessions.
router.get('/', async (_req, res) => {
  try {
    const sessions = await getSessions()

    return res.json({
      success: true,
      sessions,
    })
  } catch (error) {
    console.error('Get sessions error:', error)

    return res.status(500).json({
      success: false,
      message: 'Could not retrieve sessions.',
    })
  }
})

// Get one session.
router.get('/:id', async (req, res) => {
  try {
    const session = await getSession(req.params.id)

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found.',
      })
    }

    return res.json({
      success: true,
      session,
    })
  } catch (error) {
    console.error('Get session error:', error)

    return res.status(500).json({
      success: false,
      message: 'Could not retrieve session.',
    })
  }
})

// Delete session history only. Spreadsheet data remains untouched.
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteSession(req.params.id)

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Session not found.',
      })
    }

    return res.json({
      success: true,
      message: 'Session history deleted.',
    })
  } catch (error) {
    console.error('Delete session error:', error)

    return res.status(500).json({
      success: false,
      message: 'Could not delete session.',
    })
  }
})

export default router

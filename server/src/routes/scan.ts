
import { Router } from 'express'
import { upload } from '../lib/upload.js'
import { processPrescription } from '../services/prescription.js'
import { appendPrescription } from '../services/googleSheets.js'
import {
  getSession,
  updateSession,
} from '../services/sessions.js'

const router = Router()

router.post('/process', upload.single('image'), async (req, res) => {
  const { sheetId, sessionId } = req.body

  let sessionCounted = false

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Prescription image is required.',
      })
    }

    if (typeof sheetId !== 'string' || !sheetId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Spreadsheet ID is required.',
      })
    }

    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required.',
      })
    }

    const session = await getSession(sessionId)

    if (!session || session.sheetId !== sheetId) {
      return res.status(404).json({
        success: false,
        message: 'Valid scanning session not found.',
      })
    }

    // Count this image as received.
    await updateSession(sessionId, {
      totalImages: session.totalImages + 1,
    })
    sessionCounted = true

    const result = await processPrescription(
      req.file.buffer,
      req.file.mimetype
    )

    if (result.status === 'review') {
      await updateSession(sessionId, {
        needsReview: session.needsReview + 1,
      })

      return res.json({
        success: true,
        status: 'review',
        prescription: result.prescription,
        message: 'Some fields require manual review.',
      })
    }

    const saved = await appendPrescription(
      sheetId,
      result.prescription
    )

    await updateSession(sessionId, {
      saved: session.saved + 1,
    })

    return res.json({
      success: true,
      status: 'saved',
      prescription: result.prescription,
      serialNumber: saved.serialNumber,
      message: 'Prescription saved successfully.',
    })
  } catch (error) {
    console.error('Prescription processing error:', error)

    if (sessionCounted) {
      try {
        const session = await getSession(sessionId)

        if (session) {
          await updateSession(sessionId, {
            failed: session.failed + 1,
          })
        }
      } catch (sessionError) {
        console.error('Session update error:', sessionError)
      }
    }

    return res.status(500).json({
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Prescription processing failed.',
    })
  }
})

export default router

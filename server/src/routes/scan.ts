
import { Router } from 'express'
import { upload } from '../lib/upload.js'
import { processPrescription } from '../services/prescription.js'
import { appendPrescription } from '../services/googleSheets.js'

const router = Router()

router.post('/process', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Prescription image is required',
      })
    }

    const { sheetId, sheetName = 'Sheet1' } = req.body

    if (typeof sheetId !== 'string' || !sheetId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Spreadsheet ID is required',
      })
    }

    // Extract and validate prescription
    const result = await processPrescription(
      req.file.buffer,
      req.file.mimetype
    )

    if (result.status === 'review') {
      return res.json({
        success: true,
        status: 'review',
        prescription: result.prescription,
        message: 'Some fields require manual review',
      })
    }

    // Save to Google Sheets
    const saved = await appendPrescription(
      sheetId,
      result.prescription,
      sheetName
    )

    return res.json({
      success: true,
      status: 'saved',
      prescription: result.prescription,
      serialNumber: saved.serialNumber,
      message: 'Prescription saved successfully',
    })

  } catch (error) {
    console.error('Prescription processing error:', error)

    return res.status(500).json({
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Prescription processing failed',
    })
  }
})

export default router

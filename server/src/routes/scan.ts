
import { Router } from 'express'
import { upload } from '../lib/upload.js'
import { processPrescription } from '../services/prescription.js'

const router = Router()

router.post('/process', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Prescription image is required',
      })
    }

    const result = await processPrescription(
      req.file.buffer,
      req.file.mimetype
    )

    return res.json({
      success: true,
      ...result,
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

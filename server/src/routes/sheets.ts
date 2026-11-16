
import { Router } from 'express'
import { google } from 'googleapis'
import { getGoogleAuth } from '../services/googleSheets.js'

const router = Router()

const headers = [
  'Sl.No',
  'Date',
  'Patient Name',
  'Case Sheet Ref.',
  'Name of Medicine',
  'Dose/Quantity',
]

// GET: List existing spreadsheets
router.get('/', async (_req, res) => {
  try {
    const drive = google.drive({
      version: 'v3',
      auth: getGoogleAuth(),
    })

    const response = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      pageSize: 100,
      orderBy: 'modifiedTime desc',
      fields: 'files(id,name,modifiedTime)',
    })

    return res.json({
      success: true,
      spreadsheets: response.data.files || [],
    })
  } catch (error) {
    console.error('List spreadsheets error:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to fetch spreadsheets',
    })
  }
})

// POST: Create a new spreadsheet
router.post('/', async (req, res) => {
  try {
    const { name, addHeader = true } = req.body

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Spreadsheet name is required',
      })
    }

    const sheets = google.sheets({
      version: 'v4',
      auth: getGoogleAuth(),
    })

    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: name.trim(),
        },
      },
    })

    const spreadsheetId = response.data.spreadsheetId

    if (!spreadsheetId) {
      throw new Error('Spreadsheet creation failed')
    }

    if (addHeader) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Sheet1!A1:F1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers],
        },
      })
    }

    return res.status(201).json({
      success: true,
      spreadsheet: {
        id: spreadsheetId,
        name: response.data.properties?.title,
        url: response.data.spreadsheetUrl,
      },
    })
  } catch (error) {
    console.error('Create spreadsheet error:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to create spreadsheet',
    })
  }
})

// GET: Spreadsheet details
router.get('/:id', async (req, res) => {
  try {
    const sheets = google.sheets({
      version: 'v4',
      auth: getGoogleAuth(),
    })

    const response = await sheets.spreadsheets.get({
      spreadsheetId: req.params.id,
      fields: 'spreadsheetId,properties,sheets.properties',
    })

    return res.json({
      success: true,
      spreadsheet: response.data,
    })
  } catch (error) {
    console.error('Get spreadsheet error:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve spreadsheet',
    })
  }
})

export default router

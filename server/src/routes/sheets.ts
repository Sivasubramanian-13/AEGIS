
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

// GET: Export spreadsheet as Excel (.xlsx)
router.get('/:id/export', async (req, res) => {
  try {
    const drive = google.drive({
      version: 'v3',
      auth: getGoogleAuth(),
    })

    // Get spreadsheet name for the downloaded filename.
    const file = await drive.files.get({
      fileId: req.params.id,
      fields: 'name',
    })

    // Export Google Sheets to XLSX format.
    const response = await drive.files.export(
      {
        fileId: req.params.id,
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      {
        responseType: 'arraybuffer',
      }
    )

    const buffer = Buffer.from(response.data as ArrayBuffer)

    const filename = (file.data.name || 'prescriptions')
      .replace(/[<>:"/\\|?*]/g, '_')
      .trim()

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.xlsx"`
    )

    res.setHeader('Content-Length', buffer.length)

    return res.send(buffer)
  } catch (error) {
    console.error('Export spreadsheet error:', error)

    return res.status(500).json({
      success: false,
      message: 'Unable to export spreadsheet as Excel',
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

// GET: Read prescription records from a spreadsheet
router.get('/:id/rows', async (req, res) => {
  try {
    const sheets = google.sheets({
      version: 'v4',
      auth: getGoogleAuth(),
    })

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: req.params.id,
      range: 'Sheet1!A:F',
    })

    const values = response.data.values || []

    // Skip the header row and return six columns per record.
    const rows = values.slice(1).map((row, index) => ({
      id: String(index + 1),
      values: Array.from(
        { length: 6 },
        (_, columnIndex) => String(row[columnIndex] ?? '')
      ),
    }))

    return res.json({ success: true, rows })
  } catch (error) {
    console.error('Read spreadsheet rows error:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to read spreadsheet records',
    })
  }
})

// PUT: Save corrected prescription records
router.put('/:id/rows', async (req, res) => {
  try {
    const { rows } = req.body

    if (!Array.isArray(rows)) {
      return res.status(400).json({
        success: false,
        message: 'Rows must be an array',
      })
    }

    const sheets = google.sheets({
      version: 'v4',
      auth: getGoogleAuth(),
    })

    const values = rows.map((row: { values: string[] }, index: number) => {
      if (!Array.isArray(row.values) || row.values.length !== 6) {
        throw new Error(`Invalid row at position ${index + 1}`)
      }

      return [
        String(index + 1),
        ...row.values.slice(1).map(value => String(value ?? '')),
      ]
    })

    // Clear old records first, so deleted rows are removed too.
    await sheets.spreadsheets.values.clear({
      spreadsheetId: req.params.id,
      range: 'Sheet1!A2:F',
    })

    if (values.length > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: req.params.id,
        range: 'Sheet1!A2:F',
        valueInputOption: 'RAW',
        requestBody: { values },
      })
    }

    return res.json({
      success: true,
      message: 'Spreadsheet records updated',
    })
  } catch (error) {
    console.error('Save spreadsheet rows error:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to save spreadsheet records',
    })
  }
})

// DELETE: Delete an actual Google spreadsheet
router.delete('/:id', async (req, res) => {
  try {
    const drive = google.drive({
      version: 'v3',
      auth: getGoogleAuth(),
    })

    await drive.files.delete({
      fileId: req.params.id,
    })

    return res.json({
      success: true,
      message: 'Spreadsheet deleted',
    })
  } catch (error) {
    console.error('Delete spreadsheet error:', error)
    return res.status(500).json({
      success: false,
      message: 'Unable to delete spreadsheet',
    })
  }
})

export default router

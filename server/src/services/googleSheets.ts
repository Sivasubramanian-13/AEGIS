import { google } from 'googleapis'
import type { Credentials } from 'google-auth-library'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

const tokenPath = path.resolve(
  process.cwd(),
  'data',
  'google-tokens.json'
)

export function getGoogleAuth() {
  return auth
}

export function setGoogleTokens(tokens: Credentials) {
  auth.setCredentials(tokens)
}

export async function loadGoogleTokens() {
  try {
    const content = await readFile(tokenPath, 'utf-8')
    const tokens = JSON.parse(content)

    setGoogleTokens(tokens)

    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false
    }

    throw error
  }
}


export async function appendPrescription(
  spreadsheetId: string,
  prescription: {
    date: string
    patient_name: string
    case_sheet_ref: string
    medicine: string
    dose_quantity: string
  },
  sheetName = 'Sheet1'
) {
  const sheets = google.sheets({
    version: 'v4',
    auth,
  })

  // Read existing rows to determine the next serial number
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName.replace(/'/g, "''")}'!A:A`,
  })

  const rows = existing.data.values || []
  const serialNumber = Math.max(0, rows.length - 1) + 1

  // Append one prescription as exactly one row
  const response = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${sheetName.replace(/'/g, "''")}'!A:F`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        serialNumber,
        prescription.date,
        prescription.patient_name,
        prescription.case_sheet_ref,
        prescription.medicine,
        prescription.dose_quantity,
      ]],
    },
  })

  if (!response.data.updates?.updatedRange) {
    throw new Error('Google Sheets row insertion could not be confirmed')
  }

  return {
    success: true,
    serialNumber,
    updatedRange: response.data.updates.updatedRange,
  }
}

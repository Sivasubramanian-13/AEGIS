
export interface PrescriptionData {
  date: string
  patient_name: string
  case_sheet_ref: string
  medicine: string
  dose_quantity: string
}

export function validatePrescription(
  data: unknown
): PrescriptionData {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid AI response')
  }

  const result = data as Record<string, unknown>

  const fields = [
    'date',
    'patient_name',
    'case_sheet_ref',
    'medicine',
    'dose_quantity',
  ]

  for (const field of fields) {
    if (
      result[field] !== undefined &&
      typeof result[field] !== 'string'
    ) {
      throw new Error(`Invalid field: ${field}`)
    }
  }

  return {
    date: (result.date as string) || '',
    patient_name: (result.patient_name as string) || '',
    case_sheet_ref: (result.case_sheet_ref as string) || '',
    medicine: (result.medicine as string) || '',
    dose_quantity: (result.dose_quantity as string) || '',
  }
}

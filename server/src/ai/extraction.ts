
export const extractionPrompt = `
Extract these fields from the handwritten prescription:

- date: DD-MM-YYYY format. If year is missing or unclear, leave empty.
- patient_name: Preserve original spelling.
- case_sheet_ref: Allow numbers and forward slashes (/).
- medicine: Include the complete medicine name and its strength/code,
  including numbers or letters immediately following the name.
- dose_quantity: ONLY the number explicitly circled or rounded
  on the prescription.

Rules:
- Exactly one medicine per prescription.
- Never confuse medicine strength (e.g. 40, 500, 50MCG)
  with the circled quantity (e.g. 60).
- Do not extract dosage instructions such as 1-0-1 as quantity.
- Never guess or invent information.
- Leave uncertain or unreadable fields empty.
- Preserve original spelling and values.
- Return only valid JSON.

{
  "date": "",
  "patient_name": "",
  "case_sheet_ref": "",
  "medicine": "",
  "dose_quantity": ""
}
`

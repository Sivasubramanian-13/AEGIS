
export const extractionPrompt = `
Extract the following fields from the handwritten prescription:

1. Date
2. Patient Name
3. Case Sheet Ref.
4. Name of Medicine
5. Dose/Quantity

Rules:
- Each prescription contains exactly one medicine.
- Preserve the original medicine name and its strength.
- Do not confuse medicine strength with dose or quantity.
- Never guess or invent missing information.
- If a field is uncertain or unreadable, return an empty string.
- Preserve the original spelling as closely as possible.
- Return only valid JSON.

Required JSON format:
{
  "date": "",
  "patient_name": "",
  "case_sheet_ref": "",
  "medicine": "",
  "dose_quantity": ""
}
`


import { detectAndCropDocument } from '../lib/document.js'
import { processImage } from '../lib/image.js'
import { validatePrescription } from '../lib/validation.js'
import { extractPrescription } from '../ai/provider.js'

export async function processPrescription(
  originalImage: Buffer,
  mimeType: string
) {
  // Step 1: Detect and crop the prescription
  const croppedImage = await detectAndCropDocument(originalImage)

  // Step 2: Resize and compress
  const processedImage = await processImage(croppedImage)

  // Step 3: Extract using selected AI provider
  const extractedData = await extractPrescription(
    processedImage,
    'image/jpeg'
  )

  // Step 4: Validate extracted fields
  const prescription = validatePrescription(extractedData)

  // Step 5: Determine review status
  const needsReview = Object.values(prescription).some(
    value => !value.trim()
  )

  return {
    status: needsReview ? 'review' : 'ready',
    prescription,
  }
}

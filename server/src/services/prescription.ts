
import { processImage } from '../lib/image.js'
import { validatePrescription } from '../lib/validation.js'
import { extractPrescription } from '../ai/provider.js'

export async function processPrescription(
  originalImage: Buffer,
  mimeType: string
) {
  // Step 1: Optimize image
  const processedImage = await processImage(originalImage)

  // Step 2: Extract prescription details
  const extractedData = await extractPrescription(
    processedImage,
    'image/jpeg'
  )

  // Step 3: Validate extracted data
  const prescription = validatePrescription(extractedData)

  // Step 4: Check whether manual review is needed
  const needsReview = Object.values(prescription).some(
    value => !value.trim()
  )

  return {
    status: needsReview ? 'review' : 'ready',
    prescription,
  }
}

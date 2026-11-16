import { extractWithGemini } from '../services/gemini.js'
import { extractWithGroq } from '../services/groq.js'

export async function extractPrescription(
  image: Buffer,
  mimeType = 'image/jpeg'
) {
  const provider = process.env.AI_PROVIDER || 'gemini'

  switch (provider.toLowerCase()) {
    case 'gemini':
      return extractWithGemini(image)

    case 'groq':
      return extractWithGroq(image, mimeType)

    default:
      throw new Error(`Unsupported AI provider: ${provider}`)
  }
}

import { GoogleGenAI } from '@google/genai'
import { config } from '../config.js'
import { extractionPrompt } from '../ai/extraction.js'

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
})

export async function extractWithGemini(image: Buffer) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Gemini API key is missing')
  }

  const response = await client.models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: [
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: image.toString('base64'),
        },
      },
      extractionPrompt,
    ],
    config: {
      responseMimeType: 'application/json',
      temperature: 0,
    },
  })

  if (!response.text) {
    throw new Error('Gemini returned an empty response')
  }

  return JSON.parse(response.text)
}

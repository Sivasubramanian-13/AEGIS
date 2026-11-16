import Groq from 'groq-sdk'
import { extractionPrompt } from '../ai/extraction.js'

export async function extractWithGroq(
  image: Buffer,
  mimeType = 'image/jpeg'
) {
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    throw new Error('Groq API key is missing')
  }

  const client = new Groq({ apiKey })

  const response = await client.chat.completions.create({
    model: 'qwen/qwen3.8-27b',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: extractionPrompt },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${image.toString('base64')}`,
          },
        },
      ],
    }],
    temperature: 0,
    max_completion_tokens: 500,
    response_format: { type: 'json_object' },
  })

  const result = response.choices[0]?.message?.content

  if (!result) {
    throw new Error('Groq returned an empty response')
  }

  return JSON.parse(result)
}
import type { IncomingMessage, ServerResponse } from 'node:http'
import { GeminiRequestError, requestGemini } from '../server/gemini.ts'

interface ApiRequest extends IncomingMessage {
  body?: unknown
}

interface JsonResponse extends ServerResponse {
  status: (statusCode: number) => JsonResponse
  json: (body: unknown) => void
}

export default async function handler(request: ApiRequest, response: JsonResponse) {
  response.setHeader('Cache-Control', 'no-store')
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash'
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''

  if (request.method === 'GET') {
    response.status(200).json({ configured: Boolean(apiKey), model })
    return
  }
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST')
    response.status(405).json({ error: 'Method not allowed.' })
    return
  }
  if (!apiKey) {
    response.status(503).json({
      error: 'Darwix AI is not configured. Ask the administrator to finish the secure connection setup.',
    })
    return
  }

  try {
    const result = await requestGemini(request.body, { apiKey, model })
    response.status(200).json(result)
  } catch (error) {
    const status = error instanceof GeminiRequestError ? error.status : 500
    response.status(status).json({
      error:
        error instanceof Error
          ? error.message
          : 'Darwix AI could not complete this request.',
    })
  }
}

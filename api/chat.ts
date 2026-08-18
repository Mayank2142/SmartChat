import { GeminiRequestError, requestGemini } from '../server/gemini.ts'

function jsonResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

async function handleRequest(request: Request) {
  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash'
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''

  if (request.method === 'GET') {
    return jsonResponse({ configured: Boolean(apiKey), model })
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405, {
      Allow: 'GET, POST',
    })
  }
  if (!apiKey) {
    return jsonResponse(
      {
        error:
          'Darwix AI is not configured. Ask the administrator to finish the secure connection setup.',
      },
      503,
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'The request body must be valid JSON.' }, 400)
  }

  try {
    return jsonResponse(await requestGemini(body, { apiKey, model }))
  } catch (error) {
    const status = error instanceof GeminiRequestError ? error.status : 500
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Darwix AI could not complete this request.',
      },
      status,
    )
  }
}

export default { fetch: handleRequest }

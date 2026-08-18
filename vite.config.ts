import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { GeminiRequestError, requestGemini } from './server/gemini.ts'

function sendJson(
  response: import('node:http').ServerResponse,
  status: number,
  body: unknown,
) {
  response.statusCode = status
  response.setHeader('Cache-Control', 'no-store')
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

function readRequestBody(request: import('node:http').IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    const chunks: Buffer[] = []
    let bytes = 0
    request.on('data', (chunk: Buffer) => {
      bytes += chunk.length
      if (bytes > 5 * 1024 * 1024) {
        reject(new GeminiRequestError('The request is too large.', 413))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new GeminiRequestError('The request body must be valid JSON.'))
      }
    })
    request.on('error', reject)
  })
}

function localGeminiApi(apiKey: string, model: string): Plugin {
  return {
    name: 'darwix-local-gemini-api',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (request, response) => {
        if (request.method === 'GET') {
          sendJson(response, 200, { configured: Boolean(apiKey), model })
          return
        }
        if (request.method !== 'POST') {
          response.setHeader('Allow', 'GET, POST')
          sendJson(response, 405, { error: 'Method not allowed.' })
          return
        }
        if (!apiKey) {
          sendJson(response, 503, {
            error:
              'Gemini is not configured. Add GEMINI_API_KEY to .env.local and restart the development server.',
          })
          return
        }

        try {
          const body = await readRequestBody(request)
          sendJson(response, 200, await requestGemini(body, { apiKey, model }))
        } catch (error) {
          sendJson(
            response,
            error instanceof GeminiRequestError ? error.status : 500,
            {
              error:
                error instanceof Error
                  ? error.message
                  : 'Darwix AI could not complete this request.',
            },
          )
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '')
  const apiKey = environment.GEMINI_API_KEY || environment.GOOGLE_API_KEY || ''
  const model = environment.GEMINI_MODEL || 'gemini-3.6-flash'

  return {
    plugins: [react(), tailwindcss(), localGeminiApi(apiKey, model)],
  }
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import chatFunction from './chat.ts'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Vercel chat function', () => {
  it('reports whether the server-side connection is configured', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')

    const response = await chatFunction.fetch(
      new Request('https://darwix.example/api/chat'),
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ configured: true })
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('rejects unsupported methods', async () => {
    const response = await chatFunction.fetch(
      new Request('https://darwix.example/api/chat', { method: 'DELETE' }),
    )

    expect(response.status).toBe(405)
    expect(response.headers.get('Allow')).toBe('GET, POST')
  })

  it('returns a clear error when the API key is missing', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    vi.stubEnv('GOOGLE_API_KEY', '')

    const response = await chatFunction.fetch(
      new Request('https://darwix.example/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Hello' }),
      }),
    )

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/not configured/i),
    })
  })

  it('handles malformed JSON without crashing the function', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')

    const response = await chatFunction.fetch(
      new Request('https://darwix.example/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      }),
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'The request body must be valid JSON.',
    })
  })
})

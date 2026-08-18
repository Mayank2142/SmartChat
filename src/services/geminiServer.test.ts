import { describe, expect, it, vi } from 'vitest'
import {
  GeminiRequestError,
  parseGeminiChatRequest,
  requestGemini,
} from '../../server/gemini.ts'

describe('Gemini server adapter', () => {
  it('validates and bounds the browser request', () => {
    expect(() => parseGeminiChatRequest({ message: '   ' })).toThrow(
      GeminiRequestError,
    )
    expect(
      parseGeminiChatRequest({
        message: 'Hello',
        history: [{ role: 'user', content: 'Earlier' }],
        responseStyle: 'concise',
      }),
    ).toMatchObject({
      message: 'Hello',
      history: [{ role: 'user', content: 'Earlier' }],
      responseStyle: 'concise',
    })
  })

  it('sends multimodal input to the Interactions API and extracts text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ outputs: [{ type: 'text', text: 'Gemini answer' }] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      requestGemini(
        {
          message: 'Describe the image',
          attachments: [
            {
              id: 'image-1',
              name: 'sample.png',
              mimeType: 'image/png',
              size: 3,
              data: 'YWJj',
            },
          ],
          responseStyle: 'balanced',
        },
        { apiKey: 'test-key', model: 'gemini-3.6-flash' },
      ),
    ).resolves.toEqual({
      content: 'Gemini answer',
      model: 'gemini-3.6-flash',
    })

    const requestOptions = fetchMock.mock.calls[0][1] as RequestInit
    const payload = JSON.parse(String(requestOptions.body)) as {
      input: Array<{ type: string; mime_type?: string }>
    }
    expect(payload.input).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'text' }),
        expect.objectContaining({ type: 'image', mime_type: 'image/png' }),
      ]),
    )
    expect((requestOptions.headers as Record<string, string>)['x-goog-api-key']).toBe(
      'test-key',
    )
  })

  it('returns an actionable authentication error from Gemini', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: { message: 'Forbidden' } }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    await expect(
      requestGemini(
        { message: 'Hello' },
        { apiKey: 'invalid', model: 'gemini-3.6-flash' },
      ),
    ).rejects.toMatchObject({
      status: 403,
      message: expect.stringMatching(/not connected correctly/i),
    })
  })
})

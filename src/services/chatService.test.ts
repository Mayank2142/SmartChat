import { describe, expect, it, vi } from 'vitest'
import { ChatServiceError, chatService } from './chatService'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('Gemini chat service', () => {
  it('sends conversation context and returns Gemini text', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ content: 'Gemini reply', model: 'gemini-3.6-flash' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      chatService.sendMessage('Current question', {
        history: [{ role: 'user', content: 'Earlier question' }],
        responseStyle: 'detailed',
      }),
    ).resolves.toEqual({ content: 'Gemini reply', model: 'gemini-3.6-flash' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Current question'),
      }),
    )
    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      history: unknown[]
      responseStyle: string
    }
    expect(request.history).toHaveLength(1)
    expect(request.responseStyle).toBe('detailed')
  })

  it('turns server failures into actionable chat errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'API key required' }, 503)),
    )

    await expect(chatService.sendMessage('Hello')).rejects.toMatchObject({
      name: 'ChatServiceError',
      message: 'API key required',
      status: 503,
    })
  })

  it('rejects empty successful responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ content: '' })))
    await expect(chatService.sendMessage('Hello')).rejects.toBeInstanceOf(
      ChatServiceError,
    )
  })

  it('reports server configuration without exposing a key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ configured: true, model: 'gemini-3.6-flash' }),
      ),
    )

    await expect(chatService.getStatus()).resolves.toEqual({
      configured: true,
      model: 'gemini-3.6-flash',
    })
  })
})

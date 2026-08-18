import { describe, expect, it, vi } from 'vitest'
import type { PersistedChatState } from '../types/chat'
import {
  CHAT_STORAGE_KEY,
  loadChatState,
  saveChatState,
} from './storage'

const storedState: PersistedChatState = {
  version: 1,
  activeSessionId: 'session-1',
  sessions: [
    {
      id: 'session-1',
      title: 'Restored chat',
      createdAt: '2026-08-18T08:00:00.000Z',
      updatedAt: '2026-08-18T08:01:00.000Z',
      messages: [
        {
          id: 'message-1',
          role: 'user',
          content: 'Interrupted request',
          createdAt: '2026-08-18T08:01:00.000Z',
          status: 'sending',
        },
      ],
    },
  ],
}

describe('chat storage', () => {
  it('validates restored data and recovers interrupted requests', () => {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(storedState))

    const loaded = loadChatState()

    expect(loaded.available).toBe(true)
    expect(loaded.state.activeSessionId).toBe('session-1')
    expect(loaded.state.sessions[0].messages[0]).toMatchObject({
      status: 'failed',
      errorMessage: expect.stringMatching(/interrupted/i),
    })
  })

  it('falls back safely when saved JSON is corrupted', () => {
    window.localStorage.setItem(CHAT_STORAGE_KEY, '{broken-json')

    const loaded = loadChatState()

    expect(loaded.available).toBe(true)
    expect(loaded.warning).toMatch(/corrupted/i)
    expect(loaded.state.sessions).toHaveLength(1)
  })

  it('continues in memory when storage access throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'SecurityError')
    })

    const loaded = loadChatState()

    expect(loaded.available).toBe(false)
    expect(loaded.state.sessions).toHaveLength(1)
  })

  it('reports save failures without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })

    expect(saveChatState(storedState)).toBe(false)
  })
})

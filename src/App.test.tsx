import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { ChatMessage } from './components/ChatMessage'
import { ChatServiceError, chatService } from './services/chatService'
import type { ChatMessage as ChatMessageType } from './types/chat'
import { CHAT_STORAGE_KEY } from './utils/storage'

function mockReply(content = 'A useful Darwix AI response.') {
  return vi.spyOn(chatService, 'sendMessage').mockResolvedValue({ content })
}

describe('responsive application shell', () => {
  it('renders the chat landmarks and enabled primary controls', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /new conversation/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /what can we build together/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('log', { name: /conversation messages/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/message darwix ai/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /start a temporary chat/i }),
    ).toBeEnabled()
    expect(screen.getByRole('button', { name: /attach files/i })).toBeEnabled()
    expect(
      screen.getByRole('button', { name: /open response settings/i }),
    ).toBeEnabled()
    expect(
      screen.queryByRole('button', { name: /clear current chat/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /skip to conversation/i }),
    ).toHaveAttribute('href', '#conversation-messages')
  })

  it('opens and closes the mobile navigation with the keyboard', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /open chat navigation/i }))
    const closeButton = screen.getByRole('button', {
      name: /close chat navigation/i,
    })
    expect(closeButton).toHaveFocus()
    expect(
      screen.getByRole('dialog', { name: /chat navigation/i }),
    ).toBeInTheDocument()
    expect(document.querySelector('.app-frame')).toHaveAttribute('inert')

    await user.keyboard('{Escape}')
    expect(
      screen.queryByRole('button', { name: /close chat navigation/i }),
    ).not.toBeInTheDocument()
  })

  it('sends with Enter, shows thinking, and completes the Darwix AI lifecycle', async () => {
    const user = userEvent.setup()
    let resolveResponse: ((value: { content: string }) => void) | undefined
    vi.spyOn(chatService, 'sendMessage').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveResponse = resolve
        }),
    )
    render(<App />)
    const composer = screen.getByLabelText(/message darwix ai/i)

    await user.type(composer, 'Plan an accessible chat experience{Enter}')

    expect(screen.getByLabelText(/^Sending$/i)).toBeInTheDocument()
    expect(
      screen.getByRole('status', { name: /darwix ai is thinking/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()
    expect(composer).toHaveValue('')
    expect(composer).toHaveFocus()

    await act(async () => {
      resolveResponse?.({ content: 'Use semantic HTML and predictable focus.' })
    })

    expect(
      await screen.findByText('Use semantic HTML and predictable focus.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/^Sent$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send message/i })).toBeDisabled()
  })

  it('keeps the draft but blocks every second submission until the active response finishes', async () => {
    const user = userEvent.setup()
    let resolveFirstResponse: ((value: { content: string }) => void) | undefined
    const sendSpy = vi
      .spyOn(chatService, 'sendMessage')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstResponse = resolve
          }),
      )
      .mockResolvedValueOnce({ content: 'Second answer.' })
    render(<App />)
    const composer = screen.getByLabelText(/message darwix ai/i)
    const sendButton = screen.getByRole('button', { name: /send message/i })

    await user.type(composer, 'First request{Enter}')
    expect(sendButton).toBeDisabled()
    expect(sendSpy).toHaveBeenCalledTimes(1)

    await user.type(composer, 'Second request')
    await user.keyboard('{Enter}')
    await user.dblClick(sendButton)

    expect(composer).toHaveValue('Second request')
    expect(sendSpy).toHaveBeenCalledTimes(1)
    expect(screen.getAllByRole('article', { name: /your message/i })).toHaveLength(1)
    expect(screen.getByRole('status', { name: /darwix ai is thinking/i })).toBeInTheDocument()

    await act(async () => {
      resolveFirstResponse?.({ content: 'First answer.' })
    })
    await waitFor(() => expect(sendButton).toBeEnabled())

    await user.click(composer)
    await user.keyboard('{Enter}')
    expect(sendSpy).toHaveBeenCalledTimes(2)
    expect(await screen.findByText('Second answer.')).toBeInTheDocument()
  })

  it('preserves Shift + Enter and prevents rapid duplicates', async () => {
    const user = userEvent.setup()
    mockReply()
    render(<App />)
    const composer = screen.getByLabelText(/message darwix ai/i)

    await user.type(composer, 'First line')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    await user.type(composer, 'Second line')
    expect(composer).toHaveValue('First line\nSecond line')

    await user.dblClick(screen.getByRole('button', { name: /send message/i }))
    expect(screen.getAllByRole('article', { name: /your message/i })).toHaveLength(1)
  })

  it('blocks whitespace-only input and fills the composer from a suggestion', async () => {
    const user = userEvent.setup()
    render(<App />)
    const composer = screen.getByLabelText(/message darwix ai/i)
    const sendButton = screen.getByRole('button', { name: /send message/i })

    await user.type(composer, '   ')
    expect(sendButton).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /help me draft/i }))
    expect(composer).toHaveValue('Help me draft a thoughtful project brief')
    expect(sendButton).toBeEnabled()
  })

  it('renders a distinct bot message with accessible timestamp details', () => {
    const botMessage: ChatMessageType = {
      id: 'bot-message',
      role: 'bot',
      content: 'I can help with that.',
      createdAt: '2026-08-18T10:30:00.000Z',
      status: 'sent',
    }

    render(<ChatMessage message={botMessage} />)
    const message = screen.getByRole('article', { name: /darwix ai message/i })
    expect(within(message).getByText('Darwix AI')).toBeInTheDocument()
    expect(
      within(message).getByRole('button', { name: /status: sent/i }),
    ).toBeInTheDocument()
  })

  it('announces formatted answers as clean text without Markdown symbols', async () => {
    const user = userEvent.setup()
    mockReply('**API** means **Application Programming Interface**.')
    render(<App />)

    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'What is API?{Enter}',
    )

    const announcement = await screen.findByText(
      'Darwix AI replied: API means Application Programming Interface.',
    )
    expect(announcement).not.toHaveTextContent('**')
  })

  it('shows a retry option when Darwix AI delivery fails', async () => {
    const user = userEvent.setup()
    vi.spyOn(chatService, 'sendMessage').mockRejectedValue(
      new ChatServiceError('Controlled delivery failure'),
    )
    render(<App />)

    await user.type(screen.getByLabelText(/message darwix ai/i), 'Fail once{Enter}')

    expect(await screen.findByLabelText(/^Not delivered$/i)).toBeInTheDocument()
    const error = screen.getByRole('alert')
    expect(error).toHaveTextContent('Controlled delivery failure')
    expect(
      within(error).getByRole('button', { name: /retry failed message/i }),
    ).toBeEnabled()
  })

  it('retries the original message without duplication', async () => {
    const user = userEvent.setup()
    vi.spyOn(chatService, 'sendMessage')
      .mockRejectedValueOnce(new ChatServiceError('First attempt failed'))
      .mockResolvedValueOnce({ content: 'The retry succeeded.' })
    render(<App />)

    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'Retry this request{Enter}',
    )
    await user.click(
      await screen.findByRole('button', { name: /retry failed message/i }),
    )

    expect(await screen.findByText('The retry succeeded.')).toBeInTheDocument()
    expect(screen.getAllByRole('article', { name: /your message/i })).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('handles malformed responses without adding an empty message', async () => {
    const user = userEvent.setup()
    vi.spyOn(chatService, 'sendMessage').mockResolvedValue({ content: '' })
    render(<App />)

    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'Return malformed data{Enter}',
    )

    expect(await screen.findByLabelText(/^Not delivered$/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('article', { name: /darwix ai message/i }),
    ).not.toBeInTheDocument()
  })

  it('attaches a file, displays it, and sends its data to Darwix AI', async () => {
    const user = userEvent.setup()
    const sendSpy = mockReply('The file contains a short greeting.')
    render(<App />)
    const file = new File(['hello Darwix AI'], 'notes.txt', { type: 'text/plain' })

    await user.upload(screen.getByLabelText(/choose files to attach/i), file)
    expect(await screen.findByText('notes.txt')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/message darwix ai/i), 'Summarize this{Enter}')

    expect(await screen.findByText('The file contains a short greeting.')).toBeInTheDocument()
    expect(sendSpy).toHaveBeenCalledWith(
      'Summarize this',
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            name: 'notes.txt',
            mimeType: 'text/plain',
            data: expect.any(String),
          }),
        ],
      }),
    )
    expect(screen.getAllByText('notes.txt').length).toBeGreaterThan(0)
  })

  it('rejects attachments over the client size limit', async () => {
    const user = userEvent.setup()
    render(<App />)
    const file = new File([new Uint8Array(3 * 1024 * 1024 + 1)], 'large.txt', {
      type: 'text/plain',
    })

    await user.upload(screen.getByLabelText(/choose files to attach/i), file)
    expect(await screen.findByRole('alert')).toHaveTextContent(/3 MB or less/i)
    expect(screen.queryByText('large.txt')).not.toBeInTheDocument()
  })

  it('creates a saved chat and switches back to the previous session', async () => {
    const user = userEvent.setup()
    mockReply('First session response')
    render(<App />)

    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'First session message{Enter}',
    )
    await screen.findByText('First session response')
    await user.click(
      screen.getByRole('button', { name: /new saved conversation/i }),
    )

    expect(
      screen.getByRole('heading', { name: /new conversation/i }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'First session message' }))
    expect(screen.getByText('First session response')).toBeInTheDocument()
  })

  it('keeps temporary chat messages out of saved history', async () => {
    const user = userEvent.setup()
    mockReply('Temporary response')
    render(<App />)

    await user.click(
      screen.getByRole('button', { name: /start a temporary chat/i }),
    )
    expect(screen.getByRole('status')).toHaveTextContent(/not saved to history/i)
    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'Do not persist this{Enter}',
    )
    await screen.findByText('Temporary response')

    await waitFor(() => {
      const saved = JSON.parse(
        window.localStorage.getItem(CHAT_STORAGE_KEY) ?? '{}',
      ) as { sessions?: Array<{ messages?: Array<{ content?: string }> }> }
      const savedContent = saved.sessions
        ?.flatMap((session) => session.messages ?? [])
        .map((message) => message.content)
      expect(savedContent).not.toContain('Do not persist this')
    })
  })

  it('collapses and expands the desktop sidebar', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }))
    expect(document.querySelector('.app-frame')).toHaveClass(
      'app-frame-sidebar-collapsed',
    )
    await user.click(screen.getByRole('button', { name: /expand sidebar/i }))
    expect(document.querySelector('.app-frame')).not.toHaveClass(
      'app-frame-sidebar-collapsed',
    )
  })

  it('opens settings and applies theme and response preferences', async () => {
    const user = userEvent.setup()
    vi.spyOn(chatService, 'getStatus').mockResolvedValue({
      configured: true,
      model: 'gemini-3.6-flash',
    })
    render(<App />)

    await user.click(screen.getByRole('button', { name: /open response settings/i }))
    const dialog = screen.getByRole('dialog', { name: /settings/i })
    expect(dialog).toBeInTheDocument()
    expect(dialog).not.toHaveTextContent(/Gemini/i)
    expect(within(dialog).getByText(/darwix ai connection/i)).toBeInTheDocument()
    expect(document.querySelector('.app-frame')).toHaveAttribute('inert')
    await user.click(within(dialog).getByRole('button', { name: /light/i }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    await user.click(within(dialog).getByRole('radio', { name: /detailed/i }))
    expect(
      within(dialog).getByRole('radio', { name: /detailed/i }),
    ).toHaveAttribute('aria-checked', 'true')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: /settings/i })).not.toBeInTheDocument()
  })

  it('deletes a saved session only after confirmation', async () => {
    const user = userEvent.setup()
    mockReply('Disposable response')
    render(<App />)

    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'Session to delete{Enter}',
    )
    await screen.findByText('Disposable response')
    await user.click(
      screen.getByRole('button', { name: /new saved conversation/i }),
    )
    await user.click(
      screen.getByRole('button', { name: /delete session to delete/i }),
    )

    expect(screen.getByRole('alertdialog')).toHaveTextContent('Delete this chat?')
    await user.click(screen.getByRole('button', { name: /delete chat/i }))
    expect(
      screen.queryByRole('button', { name: /delete session to delete/i }),
    ).not.toBeInTheDocument()
  })

  it('saves and restores a completed conversation', async () => {
    const user = userEvent.setup()
    mockReply('This response will be restored.')
    const view = render(<App />)

    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'Persist this conversation{Enter}',
    )
    await screen.findByText('This response will be restored.')
    await waitFor(() => {
      expect(window.localStorage.getItem(CHAT_STORAGE_KEY)).toContain(
        'Persist this conversation',
      )
    })

    view.unmount()
    render(<App />)
    expect(screen.getByText('This response will be restored.')).toBeInTheDocument()
  })

  it('continues chatting when LocalStorage writes are unavailable', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    mockReply('In-memory response')
    render(<App />)

    expect(await screen.findByText(/history unavailable/i)).toBeInTheDocument()
    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'Continue in memory{Enter}',
    )
    expect(await screen.findByText('In-memory response')).toBeInTheDocument()
  })

  it('has no detectable accessibility violations in the default shell', async () => {
    const { container } = render(<App />)
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(results.violations).toEqual([])
  })

  it('has no detectable accessibility violations in settings', async () => {
    const user = userEvent.setup()
    vi.spyOn(chatService, 'getStatus').mockResolvedValue({
      configured: false,
      model: 'gemini-3.6-flash',
    })
    const { container } = render(<App />)
    await user.click(screen.getByRole('button', { name: /open response settings/i }))
    await screen.findByText(/api key required/i)

    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(results.violations).toEqual([])
  })
})

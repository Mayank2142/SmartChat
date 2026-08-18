import {
  useLayoutEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { ArrowUp, Paperclip, SlidersHorizontal } from 'lucide-react'
import { MAX_MESSAGE_LENGTH, normalizeMessageContent } from '../utils/message'

interface ChatComposerProps {
  inputRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onValueChange: (value: string) => void
  onSend: (content: string) => void
}

export function ChatComposer({
  inputRef,
  value,
  onValueChange,
  onSend,
}: ChatComposerProps) {
  const submissionLockRef = useRef(false)
  const normalizedValue = normalizeMessageContent(value)
  const canSend = normalizedValue.length > 0
  const showCount = value.length >= MAX_MESSAGE_LENGTH * 0.8

  useLayoutEffect(() => {
    const input = inputRef.current
    if (!input) return

    input.style.height = 'auto'
    const nextHeight = Math.min(input.scrollHeight, 160)
    input.style.height = `${Math.max(nextHeight, 52)}px`
    input.style.overflowY = input.scrollHeight > 160 ? 'auto' : 'hidden'
  }, [inputRef, value])

  const submit = () => {
    if (!canSend || submissionLockRef.current) return

    submissionLockRef.current = true
    onSend(normalizedValue)
    onValueChange('')

    queueMicrotask(() => {
      submissionLockRef.current = false
      inputRef.current?.focus()
    })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submit()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <div className="composer-wrap">
      <form className="composer" aria-label="Send a message" onSubmit={handleSubmit}>
        <label htmlFor="chat-message" className="sr-only">
          Message Darwix AI
        </label>
        <textarea
          ref={inputRef}
          id="chat-message"
          name="message"
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          className="composer-input"
          placeholder="Message Darwix AI..."
          value={value}
          aria-describedby="composer-help composer-count"
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="flex items-end justify-between gap-3 px-2 pb-2">
          <div className="flex items-center gap-1">
            <button type="button" className="composer-tool" aria-label="Attach a file" disabled>
              <Paperclip size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="composer-tool"
              aria-label="Open response options"
              disabled
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span
              id="composer-count"
              className={showCount ? 'character-count' : 'sr-only'}
              aria-live={showCount ? 'polite' : 'off'}
            >
              {value.length} / {MAX_MESSAGE_LENGTH}
            </span>
            <button
              type="submit"
              className="send-button"
              aria-label="Send message"
              disabled={!canSend}
            >
              <ArrowUp size={18} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>
      <p id="composer-help" className="composer-help">
        Press Enter to send · Shift + Enter for a new line
      </p>
    </div>
  )
}

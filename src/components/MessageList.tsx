import {
  memo,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import type { ChatMessage as ChatMessageType } from '../types/chat'
import { ChatMessage } from './ChatMessage'
import { TypingIndicator } from './TypingIndicator'

export const INITIAL_MESSAGE_WINDOW = 160
export const MESSAGE_WINDOW_BATCH = 160

interface MessageListProps {
  containerRef?: RefObject<HTMLDivElement | null>
  isTyping?: boolean
  messages: ChatMessageType[]
  pendingResponses?: number
  onRetry?: (messageId: string) => void
}

interface ScrollAnchor {
  scrollHeight: number
  scrollTop: number
}

export const MessageList = memo(function MessageList({
  containerRef,
  isTyping = false,
  messages,
  pendingResponses = 0,
  onRetry,
}: MessageListProps) {
  const [visibleCount, setVisibleCount] = useState(() =>
    Math.min(messages.length, INITIAL_MESSAGE_WINDOW),
  )
  const previousLengthRef = useRef(messages.length)
  const pendingScrollAnchorRef = useRef<ScrollAnchor | null>(null)
  const addedMessageCount = Math.max(
    0,
    messages.length - previousLengthRef.current,
  )
  const effectiveVisibleCount = Math.min(
    messages.length,
    visibleCount + addedMessageCount,
  )
  const firstVisibleIndex = Math.max(
    0,
    messages.length - effectiveVisibleCount,
  )
  const visibleMessages = messages.slice(firstVisibleIndex)
  const remainingCount = firstVisibleIndex
  const nextBatchCount = Math.min(remainingCount, MESSAGE_WINDOW_BATCH)
  const usesHistoryWindow = messages.length > INITIAL_MESSAGE_WINDOW

  useLayoutEffect(() => {
    const previousLength = previousLengthRef.current
    previousLengthRef.current = messages.length

    if (messages.length < previousLength) {
      setVisibleCount(Math.min(messages.length, INITIAL_MESSAGE_WINDOW))
      return
    }

    const appendedCount = messages.length - previousLength
    if (appendedCount > 0) {
      setVisibleCount((currentCount) =>
        Math.min(messages.length, currentCount + appendedCount),
      )
    }
  }, [messages.length])

  useLayoutEffect(() => {
    const anchor = pendingScrollAnchorRef.current
    const container = containerRef?.current
    if (!anchor || !container) return

    container.scrollTop =
      anchor.scrollTop + (container.scrollHeight - anchor.scrollHeight)
    pendingScrollAnchorRef.current = null
  }, [containerRef, visibleCount])

  const loadOlderMessages = useCallback(() => {
    if (remainingCount === 0) return

    const container = containerRef?.current
    if (container) {
      pendingScrollAnchorRef.current = {
        scrollHeight: container.scrollHeight,
        scrollTop: container.scrollTop,
      }
    }

    setVisibleCount((currentCount) =>
      Math.min(messages.length, currentCount + MESSAGE_WINDOW_BATCH),
    )
  }, [containerRef, messages.length, remainingCount])

  return (
    <div className="message-history">
      {usesHistoryWindow && (
        <div className="history-window-control">
          <button
            type="button"
            className="load-history-button"
            disabled={remainingCount === 0}
            onClick={loadOlderMessages}
          >
            {remainingCount > 0
              ? `Load ${nextBatchCount.toLocaleString()} older messages`
              : 'All messages loaded'}
          </button>
          <span className="history-window-count">
            Showing {effectiveVisibleCount.toLocaleString()} of{' '}
            {messages.length.toLocaleString()}
          </span>
        </div>
      )}

      <ol
        className="message-list"
        aria-label="Messages"
        start={firstVisibleIndex + 1}
      >
        {visibleMessages.map((message) => (
          <li key={message.id}>
            <ChatMessage message={message} onRetry={onRetry} />
          </li>
        ))}
        {isTyping && (
          <li>
            <TypingIndicator pendingResponses={pendingResponses} />
          </li>
        )}
      </ol>
    </div>
  )
})

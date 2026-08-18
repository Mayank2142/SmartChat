import {
  Bot,
  CheckCheck,
  CircleAlert,
  Clock3,
  RotateCw,
} from 'lucide-react'
import { memo } from 'react'
import type { ChatMessage as ChatMessageType, MessageStatus } from '../types/chat'
import { CopyMessageButton } from './CopyMessageButton'
import { MessageTimestamp } from './MessageTimestamp'
import { RetryMessageButton } from './RetryMessageButton'

const statusPresentation: Record<
  MessageStatus,
  { label: string; icon: typeof CheckCheck }
> = {
  sending: { label: 'Sending', icon: Clock3 },
  sent: { label: 'Sent', icon: CheckCheck },
  failed: { label: 'Not delivered', icon: CircleAlert },
  retrying: { label: 'Retrying', icon: RotateCw },
}

interface ChatMessageProps {
  message: ChatMessageType
  onRetry?: (messageId: string) => void
}

export const ChatMessage = memo(function ChatMessage({
  message,
  onRetry,
}: ChatMessageProps) {
  const isBot = message.role === 'bot'
  const status = statusPresentation[message.status]
  const StatusIcon = status.icon

  return (
    <article
      className={`message-row ${isBot ? 'message-row-bot' : 'message-row-user'}`}
      aria-label={`${isBot ? 'Darwix AI' : 'Your'} message`}
    >
      {isBot && (
        <div className="bot-avatar" aria-hidden="true">
          <Bot size={18} strokeWidth={1.8} />
        </div>
      )}

      <div className={`message-stack ${isBot ? 'items-start' : 'items-end'}`}>
        {isBot && (
          <div className="message-author">
            <span>Darwix AI</span>
            <span className="ai-badge">AI</span>
          </div>
        )}

        <div className={`message-bubble ${isBot ? 'message-bubble-bot' : 'message-bubble-user'}`}>
          <p className="message-content">{message.content}</p>
        </div>

        <div className={`message-footer ${isBot ? '' : 'justify-end'}`}>
          <MessageTimestamp
            messageId={message.id}
            role={message.role}
            status={message.status}
            timestamp={message.createdAt}
          />
          {isBot && <CopyMessageButton content={message.content} />}
          {!isBot && (
            <span
              className={`delivery-status delivery-status-${message.status}`}
              aria-label={status.label}
            >
              <StatusIcon
                size={12}
                className={message.status === 'retrying' ? 'status-spin' : undefined}
                aria-hidden="true"
              />
              {status.label}
            </span>
          )}
        </div>

        {!isBot &&
          (message.status === 'failed' || message.status === 'retrying') && (
            <div
              className={`delivery-error ${message.status === 'retrying' ? 'delivery-error-retrying' : ''}`}
              role={message.status === 'failed' ? 'alert' : 'status'}
            >
              <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-200">
                  {message.status === 'retrying'
                    ? 'Trying to deliver again'
                    : 'Message not delivered'}
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                  {message.status === 'retrying'
                    ? 'Darwix AI is preparing another response.'
                    : message.errorMessage || 'Something interrupted the response.'}
                </p>
              </div>
              {onRetry && (
                <RetryMessageButton
                  disabled={message.status === 'retrying'}
                  onRetry={() => onRetry(message.id)}
                />
              )}
            </div>
          )}
      </div>
    </article>
  )
})

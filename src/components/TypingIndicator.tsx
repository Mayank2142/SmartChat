import { Bot } from 'lucide-react'

interface TypingIndicatorProps {
  pendingResponses?: number
}

export function TypingIndicator({ pendingResponses = 1 }: TypingIndicatorProps) {
  const announcement =
    pendingResponses > 1
      ? `Darwix AI is preparing ${pendingResponses} responses`
      : 'Darwix AI is typing'

  return (
    <div className="typing-row" role="status" aria-live="polite" aria-label={announcement}>
      <div className="bot-avatar" aria-hidden="true">
        <Bot size={18} strokeWidth={1.8} />
      </div>
      <div className="typing-content">
        <p className="sr-only">{announcement}</p>
        <span className="typing-dot" aria-hidden="true" />
        <span className="typing-dot" aria-hidden="true" />
        <span className="typing-dot" aria-hidden="true" />
      </div>
    </div>
  )
}

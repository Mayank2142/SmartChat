import { Bot } from 'lucide-react'

export function TypingIndicator() {
  const announcement = 'Darwix AI is thinking'

  return (
    <div className="typing-row" role="status" aria-live="polite" aria-label={announcement}>
      <div className="bot-avatar" aria-hidden="true">
        <Bot size={18} strokeWidth={1.8} />
      </div>
      <div className="typing-content">
        <p className="sr-only">{announcement}</p>
        <span className="thinking-orb" aria-hidden="true">
          <span className="thinking-orb-core" />
          <span className="thinking-orb-ring thinking-orb-ring-horizontal" />
          <span className="thinking-orb-ring thinking-orb-ring-vertical" />
        </span>
        <span className="typing-copy" aria-hidden="true">
          <span className="typing-label">Thinking</span>
          <span className="typing-dots">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </span>
        </span>
      </div>
    </div>
  )
}

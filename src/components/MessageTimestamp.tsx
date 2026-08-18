import type { MessageRole, MessageStatus } from '../types/chat'
import { formatDetailedMessageTime, formatMessageTime } from '../utils/date'

const statusLabels: Record<MessageStatus, string> = {
  sending: 'Sending',
  sent: 'Sent',
  failed: 'Message not delivered',
  retrying: 'Retrying',
}

interface MessageTimestampProps {
  messageId: string
  role: MessageRole
  status: MessageStatus
  timestamp: string
}

export function MessageTimestamp({
  messageId,
  role,
  status,
  timestamp,
}: MessageTimestampProps) {
  const compactTime = formatMessageTime(timestamp)
  const detailedTime = formatDetailedMessageTime(timestamp)
  const tooltipId = `timestamp-${messageId}`
  const sender = role === 'bot' ? 'Darwix AI' : 'Your'

  return (
    <span className="timestamp-wrap">
      <button
        type="button"
        className="timestamp-trigger"
        aria-label={`${sender} message from ${detailedTime}. Status: ${statusLabels[status]}`}
        aria-describedby={tooltipId}
      >
        {compactTime}
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`timestamp-tooltip timestamp-tooltip-${role}`}
      >
        <span className="block whitespace-nowrap font-medium text-slate-200">
          {detailedTime}
        </span>
        <span className="mt-1 block text-[10px] text-slate-400">
          Status: {statusLabels[status]}
        </span>
      </span>
    </span>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types/chat'

interface LatestMessageState {
  messageId?: string
  sessionId: string
}

export function markdownToPlainText(content: string) {
  return content
    .replace(/```[^\n]*\n?/g, '')
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)\s]+\)/g, '$1')
    .replace(/\\([*_`])/g, '$1')
    .replace(/[*_`#]+/g, '')
    .replace(/^\s*(?:[-+] |\d+\. )/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function useChatAnnouncement(
  sessionId: string,
  latestMessage?: ChatMessage,
) {
  const [announcement, setAnnouncement] = useState('')
  const previousRef = useRef<LatestMessageState>({
    sessionId,
    messageId: latestMessage?.id,
  })

  useEffect(() => {
    const previous = previousRef.current
    const sessionChanged = previous.sessionId !== sessionId
    const messageChanged = previous.messageId !== latestMessage?.id

    if (sessionChanged) {
      setAnnouncement('')
    } else if (messageChanged && latestMessage?.role === 'bot') {
      setAnnouncement(
        `Darwix AI replied: ${markdownToPlainText(latestMessage.content)}`,
      )
    } else if (messageChanged && latestMessage?.role === 'user') {
      setAnnouncement('')
    }

    previousRef.current = {
      sessionId,
      messageId: latestMessage?.id,
    }
  }, [latestMessage, sessionId])

  return announcement
}

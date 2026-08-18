import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

type CopyState = 'idle' | 'copied' | 'failed'

interface CopyMessageButtonProps {
  content: string
}

async function copyText(content: string) {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard access is unavailable')
  }
  await navigator.clipboard.writeText(content)
}

export function CopyMessageButton({ content }: CopyMessageButtonProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const resetTimerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current)
      }
    },
    [],
  )

  const handleCopy = async () => {
    try {
      await copyText(content)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current)
    }
    resetTimerRef.current = window.setTimeout(() => {
      setCopyState('idle')
      resetTimerRef.current = null
    }, 2000)
  }

  const copied = copyState === 'copied'
  const label =
    copyState === 'copied'
      ? 'Copied'
      : copyState === 'failed'
        ? 'Copy failed'
        : 'Copy'

  return (
    <span className="copy-action-wrap">
      <button
        type="button"
        className={`message-action ${copied ? 'message-action-success' : ''}`}
        aria-label={`${label} bot message`}
        onClick={() => void handleCopy()}
      >
        {copied ? (
          <Check size={11} aria-hidden="true" />
        ) : (
          <Copy size={11} aria-hidden="true" />
        )}
        {label}
      </button>
      {copyState !== 'idle' && (
        <span className="sr-only" role="status">
          {copyState === 'copied'
            ? 'Bot message copied to clipboard.'
            : 'Bot message could not be copied.'}
        </span>
      )}
    </span>
  )
}

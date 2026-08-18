import { useEffect, useRef, useState } from 'react'
import type { PersistedChatState } from '../types/chat'
import { saveChatState } from '../utils/storage'

interface UseLocalStorageOptions {
  initiallyAvailable: boolean
  initialWarning?: string
  state: PersistedChatState
}

export function useLocalStorage({
  initiallyAvailable,
  initialWarning,
  state,
}: UseLocalStorageOptions) {
  const [available, setAvailable] = useState(initiallyAvailable)
  const [warning, setWarning] = useState(initialWarning)
  const firstSaveRef = useRef(true)

  useEffect(() => {
    const delay = firstSaveRef.current ? 0 : 250
    firstSaveRef.current = false
    let idleCallbackId: number | undefined

    const persistState = () => {
      const saved = saveChatState(state)
      setAvailable(saved)
      setWarning(
        saved
          ? undefined
          : 'Chat history could not be saved. This session remains available in memory.',
      )
    }

    const saveTimer = window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        idleCallbackId = window.requestIdleCallback(persistState, {
          timeout: 1000,
        })
      } else {
        persistState()
      }
    }, delay)

    return () => {
      window.clearTimeout(saveTimer)
      if (idleCallbackId !== undefined && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleCallbackId)
      }
    }
  }, [state])

  return { available, warning }
}

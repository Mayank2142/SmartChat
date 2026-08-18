import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { useReducedMotion } from './useReducedMotion'

const NEAR_BOTTOM_THRESHOLD = 120

interface UseAutoScrollOptions {
  containerRef: RefObject<HTMLElement | null>
  contentKey: string
  contextKey?: string
}

export function getDistanceFromBottom(element: HTMLElement) {
  return Math.max(
    0,
    element.scrollHeight - element.scrollTop - element.clientHeight,
  )
}

export function isNearBottom(element: HTMLElement) {
  return getDistanceFromBottom(element) <= NEAR_BOTTOM_THRESHOLD
}

export function useAutoScroll({
  containerRef,
  contentKey,
  contextKey = 'default',
}: UseAutoScrollOptions) {
  const prefersReducedMotion = useReducedMotion()
  const isNearBottomRef = useRef(true)
  const previousContextRef = useRef(contextKey)
  const [nearBottom, setNearBottom] = useState(true)
  const [hasNewContent, setHasNewContent] = useState(false)

  const updateScrollPosition = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const nextNearBottom = isNearBottom(container)
    isNearBottomRef.current = nextNearBottom
    setNearBottom(nextNearBottom)
    if (nextNearBottom) setHasNewContent(false)
  }, [containerRef])

  const scrollToLatest = useCallback(
    (behavior?: ScrollBehavior) => {
      const container = containerRef.current
      if (!container) return

      const resolvedBehavior =
        prefersReducedMotion || behavior === 'auto' ? 'auto' : 'smooth'

      if (typeof container.scrollTo === 'function') {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: resolvedBehavior,
        })
      } else {
        container.scrollTop = container.scrollHeight
      }

      if (resolvedBehavior === 'auto') {
        isNearBottomRef.current = true
        setNearBottom(true)
        setHasNewContent(false)
      }
    },
    [containerRef, prefersReducedMotion],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => updateScrollPosition()
    const handleViewportChange = () => {
      if (!isNearBottomRef.current) return
      window.requestAnimationFrame(() => scrollToLatest('auto'))
    }

    updateScrollPosition()
    container.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleViewportChange)
    window.visualViewport?.addEventListener('resize', handleViewportChange)

    const resizeObserver =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(handleViewportChange)
        : null
    resizeObserver?.observe(container)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleViewportChange)
      window.visualViewport?.removeEventListener('resize', handleViewportChange)
      resizeObserver?.disconnect()
    }
  }, [containerRef, scrollToLatest, updateScrollPosition])

  useLayoutEffect(() => {
    if (!containerRef.current) return

    if (previousContextRef.current !== contextKey) {
      previousContextRef.current = contextKey
      isNearBottomRef.current = true
      setNearBottom(true)
      setHasNewContent(false)
      scrollToLatest('auto')
      return
    }

    if (isNearBottomRef.current) {
      scrollToLatest()
    } else {
      setHasNewContent(true)
    }
  }, [containerRef, contentKey, contextKey, scrollToLatest])

  return {
    isNearBottom: nearBottom,
    scrollToLatest,
    showJumpToLatest: hasNewContent && !nearBottom,
  }
}

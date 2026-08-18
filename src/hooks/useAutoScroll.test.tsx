import { useRef, useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { JumpToLatestButton } from '../components/JumpToLatestButton'
import {
  getDistanceFromBottom,
  isNearBottom,
  useAutoScroll,
} from './useAutoScroll'

function ScrollHarness() {
  const [contentVersion, setContentVersion] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollToLatest, showJumpToLatest } = useAutoScroll({
    containerRef,
    contentKey: String(contentVersion),
  })

  return (
    <div>
      <div ref={containerRef} data-testid="scroll-area" />
      <button type="button" onClick={() => setContentVersion((value) => value + 1)}>
        Append content
      </button>
      <JumpToLatestButton
        visible={showJumpToLatest}
        onClick={() => scrollToLatest()}
      />
    </div>
  )
}

function configureScrollArea(element: HTMLElement, scrollTop: number) {
  const scrollTo = vi.fn()
  Object.defineProperties(element, {
    clientHeight: { configurable: true, value: 400 },
    scrollHeight: { configurable: true, value: 1000 },
    scrollTop: { configurable: true, writable: true, value: scrollTop },
    scrollTo: { configurable: true, value: scrollTo },
  })
  fireEvent.scroll(element)
  scrollTo.mockClear()
  return scrollTo
}

describe('smart auto-scroll', () => {
  it('follows new content when the reader is near the bottom', async () => {
    const user = userEvent.setup()
    render(<ScrollHarness />)
    const scrollArea = screen.getByTestId('scroll-area')
    const scrollTo = configureScrollArea(scrollArea, 600)

    await user.click(screen.getByRole('button', { name: /append content/i }))

    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'smooth' })
    expect(
      screen.queryByRole('button', { name: /jump to latest/i }),
    ).not.toBeInTheDocument()
  })

  it('preserves history position and exposes a keyboard jump for new content', async () => {
    const user = userEvent.setup()
    render(<ScrollHarness />)
    const scrollArea = screen.getByTestId('scroll-area')
    const scrollTo = configureScrollArea(scrollArea, 200)

    await user.click(screen.getByRole('button', { name: /append content/i }))

    expect(scrollTo).not.toHaveBeenCalled()
    const jumpButton = screen.getByRole('button', { name: /jump to latest/i })
    jumpButton.focus()
    await user.keyboard('{Enter}')
    expect(scrollTo).toHaveBeenCalledWith({ top: 1000, behavior: 'smooth' })

    scrollArea.scrollTop = 600
    fireEvent.scroll(scrollArea)
    expect(
      screen.queryByRole('button', { name: /jump to latest/i }),
    ).not.toBeInTheDocument()
  })

  it('uses a 120px near-bottom threshold', () => {
    const element = document.createElement('div')
    Object.defineProperties(element, {
      clientHeight: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, writable: true, value: 480 },
    })

    expect(getDistanceFromBottom(element)).toBe(120)
    expect(isNearBottom(element)).toBe(true)

    element.scrollTop = 479
    expect(getDistanceFromBottom(element)).toBe(121)
    expect(isNearBottom(element)).toBe(false)
  })
})

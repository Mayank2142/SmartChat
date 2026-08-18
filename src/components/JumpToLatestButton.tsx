import { ArrowDown, Sparkles } from 'lucide-react'

interface JumpToLatestButtonProps {
  visible: boolean
  onClick: () => void
}

export function JumpToLatestButton({
  visible,
  onClick,
}: JumpToLatestButtonProps) {
  if (!visible) return null

  return (
    <div className="jump-latest-layer">
      <button type="button" className="jump-latest-button" onClick={onClick}>
        <span className="jump-latest-indicator" aria-hidden="true">
          <Sparkles size={10} />
        </span>
        Jump to latest
        <ArrowDown size={14} aria-hidden="true" />
      </button>
    </div>
  )
}

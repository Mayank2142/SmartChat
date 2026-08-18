import { RefreshCw } from 'lucide-react'

interface RetryMessageButtonProps {
  disabled?: boolean
  onRetry: () => void
}

export function RetryMessageButton({
  disabled = false,
  onRetry,
}: RetryMessageButtonProps) {
  return (
    <button
      type="button"
      className="retry-button"
      aria-label={disabled ? 'Retrying failed message' : 'Retry failed message'}
      disabled={disabled}
      onClick={onRetry}
    >
      <RefreshCw
        size={13}
        className={disabled ? 'status-spin' : undefined}
        aria-hidden="true"
      />
      {disabled ? 'Retrying' : 'Retry'}
    </button>
  )
}

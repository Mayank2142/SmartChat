import { Bot, Check, ExternalLink, Settings2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { chatService, type GeminiStatus } from '../services/chatService'
import type { ResponseStyle, ThemeMode } from '../types/chat'
import { ThemeToggle } from './ThemeToggle'

interface SettingsDialogProps {
  responseStyle: ResponseStyle
  theme: ThemeMode
  onClose: () => void
  onResponseStyleChange: (style: ResponseStyle) => void
  onThemeChange: (theme: ThemeMode) => void
}

const responseStyles: Array<{
  value: ResponseStyle
  label: string
  description: string
}> = [
  { value: 'concise', label: 'Concise', description: 'Short and direct' },
  { value: 'balanced', label: 'Balanced', description: 'Useful detail by default' },
  { value: 'detailed', label: 'Detailed', description: 'More context and steps' },
]

export function SettingsDialog({
  responseStyle,
  theme,
  onClose,
  onResponseStyleChange,
  onThemeChange,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )
  const [geminiStatus, setGeminiStatus] = useState<GeminiStatus | null>(null)
  const [statusUnavailable, setStatusUnavailable] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void chatService
      .getStatus(controller.signal)
      .then(setGeminiStatus)
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') return
        setStatusUnavailable(true)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const previousFocus = previousFocusRef.current
    closeButtonRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [onClose])

  const connectionLabel = statusUnavailable
    ? 'Status unavailable'
    : geminiStatus?.configured
      ? 'Connected'
      : geminiStatus
        ? 'API key required'
        : 'Checking connection…'

  return (
    <div className="dialog-layer">
      <button
        type="button"
        className="dialog-backdrop"
        aria-label="Close settings"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        aria-describedby="settings-description"
      >
        <div className="settings-heading">
          <div className="settings-heading-icon" aria-hidden="true">
            <Settings2 size={19} />
          </div>
          <div>
            <h2 id="settings-title">Settings</h2>
            <p id="settings-description">Personalize Darwix AI for this browser.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="icon-button settings-close"
            aria-label="Close settings"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="settings-content">
          <section className="settings-section" aria-labelledby="appearance-heading">
            <div>
              <h3 id="appearance-heading">Appearance</h3>
              <p>Switch between the supplied light and dark visual themes.</p>
            </div>
            <ThemeToggle theme={theme} onChange={onThemeChange} />
          </section>

          <section className="settings-section settings-section-stacked" aria-labelledby="response-heading">
            <div>
              <h3 id="response-heading">Response style</h3>
              <p>Choose how much detail Gemini should normally provide.</p>
            </div>
            <div className="response-style-options" role="radiogroup" aria-label="Response style">
              {responseStyles.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="response-style-option"
                  role="radio"
                  aria-checked={responseStyle === option.value}
                  onClick={() => onResponseStyleChange(option.value)}
                >
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  {responseStyle === option.value && <Check size={16} aria-hidden="true" />}
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section" aria-labelledby="model-heading">
            <div className="settings-model-copy">
              <h3 id="model-heading">Gemini connection</h3>
              <p>{geminiStatus?.model ?? 'Gemini 3.6 Flash'} · server-side API</p>
            </div>
            <span
              className={`connection-badge ${geminiStatus?.configured ? 'connection-badge-ready' : ''}`}
              role="status"
            >
              <Bot size={13} aria-hidden="true" />
              {connectionLabel}
            </span>
          </section>

          {geminiStatus && !geminiStatus.configured && (
            <div className="settings-api-help">
              <span>
                Add <code>GEMINI_API_KEY</code> to <code>.env.local</code>, then restart the app.
              </span>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
                Get an API key <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

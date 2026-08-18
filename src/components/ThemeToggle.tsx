import { Moon, Sun } from 'lucide-react'
import type { ThemeMode } from '../types/chat'

interface ThemeToggleProps {
  compact?: boolean
  theme: ThemeMode
  onChange: (theme: ThemeMode) => void
}

export function ThemeToggle({ compact = false, theme, onChange }: ThemeToggleProps) {
  return (
    <div
      className={`theme-toggle ${compact ? 'theme-toggle-compact' : ''}`}
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        className="theme-toggle-option"
        aria-pressed={theme === 'light'}
        onClick={() => onChange('light')}
      >
        <Sun size={15} aria-hidden="true" />
        {!compact && <span>Light</span>}
      </button>
      <button
        type="button"
        className="theme-toggle-option"
        aria-pressed={theme === 'dark'}
        onClick={() => onChange('dark')}
      >
        <Moon size={15} aria-hidden="true" />
        {!compact && <span>Dark</span>}
      </button>
    </div>
  )
}

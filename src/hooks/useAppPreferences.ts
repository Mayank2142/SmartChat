import { useCallback, useLayoutEffect, useState } from 'react'
import type { ResponseStyle, ThemeMode } from '../types/chat'

const THEME_KEY = 'darwix-theme'
const RESPONSE_STYLE_KEY = 'darwix-response-style'

function readTheme(): ThemeMode {
  try {
    return window.localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function readResponseStyle(): ResponseStyle {
  try {
    const value = window.localStorage.getItem(RESPONSE_STYLE_KEY)
    return value === 'concise' || value === 'detailed' ? value : 'balanced'
  } catch {
    return 'balanced'
  }
}

export function useAppPreferences() {
  const [theme, setThemeState] = useState<ThemeMode>(readTheme)
  const [responseStyle, setResponseStyleState] =
    useState<ResponseStyle>(readResponseStyle)

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#090b1e' : '#f9fafc')
  }, [theme])

  const setTheme = useCallback((nextTheme: ThemeMode) => {
    setThemeState(nextTheme)
    try {
      window.localStorage.setItem(THEME_KEY, nextTheme)
    } catch {
      // The selected theme still works for the current tab.
    }
  }, [])

  const setResponseStyle = useCallback((nextStyle: ResponseStyle) => {
    setResponseStyleState(nextStyle)
    try {
      window.localStorage.setItem(RESPONSE_STYLE_KEY, nextStyle)
    } catch {
      // The selected response style still works for the current tab.
    }
  }, [])

  return { responseStyle, setResponseStyle, setTheme, theme }
}

'use client'

import { useEffect, useState } from 'react'
import { btnSecondaryIcon } from '@/app/ui'

// The light/dark switch in the header. The theme itself is just the `dark`
// class on <html> — a tiny script in layout.tsx applies the saved choice
// before the page paints; this button only flips that class and records the
// new choice in localStorage so the script picks it up next time.
export default function ThemeToggle() {
  // `null` until mounted: the server (and the first client render) can't know
  // which theme the visitor chose, so we render a same-sized, icon-less button
  // to avoid a hydration mismatch, then read the real value from the DOM.
  const [isDark, setIsDark] = useState<boolean | null>(null)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const root = document.documentElement
    const next = !root.classList.contains('dark')
    root.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      // Private-mode localStorage can throw; the class still flipped for this
      // session, we just can't remember it. Not worth surfacing.
    }
    setIsDark(next)
  }

  // The icon shows the theme you'd switch TO, and the label says so outright.
  const label =
    isDark == null ? 'Toggle theme' : isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      type="button"
      onClick={toggle}
      className={btnSecondaryIcon}
      aria-label={label}
      title={label}
    >
      {isDark == null ? (
        <span className="h-4 w-4" aria-hidden />
      ) : isDark ? (
        <SunIcon />
      ) : (
        <MoonIcon />
      )}
    </button>
  )
}

function SunIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider> & {
  /**
   * Key that toggles light/dark globally (ignored while typing and when any
   * modifier — including Shift — is held). Pass `false` to disable.
   * @default "d"
   */
  hotkey?: string | false
}

function ThemeProvider({
  children,
  hotkey = "d",
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {hotkey ? <ThemeHotkey hotkey={hotkey} /> : null}
      {children}
    </NextThemesProvider>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

// Press the hotkey (outside a text field, no modifiers) to toggle light/dark.
function ThemeHotkey({ hotkey }: { hotkey: string }) {
  const { resolvedTheme, systemTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
        return
      }

      if (event.key.toLowerCase() !== hotkey.toLowerCase()) {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      const next = resolvedTheme === "dark" ? "light" : "dark"
      // When the target theme matches the OS preference, store "system" so the
      // hotkey never permanently pins an explicit theme.
      setTheme(next === systemTheme ? "system" : next)
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [hotkey, resolvedTheme, systemTheme, setTheme])

  return null
}

export { ThemeProvider }
export type { ThemeProviderProps }

"use client"

import * as React from "react"

import { cn } from "@weeeha/ui/lib/utils"

type Mode = "viewer" | "designer"

type ModeToggleProps = Omit<React.ComponentProps<"div">, "onChange"> & {
  mode: Mode
  onChange: (mode: Mode) => void
}

const OPTIONS: { value: Mode; label: string }[] = [
  { value: "viewer", label: "Viewer" },
  { value: "designer", label: "Designer" },
]

function ModeToggle({
  mode,
  onChange,
  className,
  "aria-label": ariaLabel = "Report view mode",
  onKeyDown,
  ...props
}: ModeToggleProps) {
  const buttonsRef = React.useRef<(HTMLButtonElement | null)[]>([])
  const selectedIndex = Math.max(
    OPTIONS.findIndex((opt) => opt.value === mode),
    0
  )

  // Radio-group keyboard contract: the selected option is the only tab stop;
  // arrows move selection and focus together, wrapping at the ends.
  const selectByIndex = (index: number) => {
    const nextIndex = (index + OPTIONS.length) % OPTIONS.length
    const next = OPTIONS[nextIndex]
    if (!next) return
    onChange(next.value)
    buttonsRef.current[nextIndex]?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault()
      selectByIndex(selectedIndex + 1)
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault()
      selectByIndex(selectedIndex - 1)
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-slot="mode-toggle"
      onKeyDown={handleKeyDown}
      className={cn(
        "inline-flex items-center rounded-md border bg-card p-0.5 text-xs",
        className
      )}
      {...props}
    >
      {OPTIONS.map((opt, index) => {
        const selected = mode === opt.value
        return (
          <button
            key={opt.value}
            ref={(node) => {
              buttonsRef.current[index] = node
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded px-3 py-1 font-medium transition-colors",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export { ModeToggle }
export type { Mode, ModeToggleProps }

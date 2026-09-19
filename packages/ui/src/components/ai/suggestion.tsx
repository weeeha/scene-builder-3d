"use client"

import { Button } from "@weeeha/ui/components/button"
import {
  ScrollArea,
  ScrollBar,
} from "@weeeha/ui/components/scroll-area"
import { cn } from "@weeeha/ui/lib/utils"
import type { ComponentProps } from "react"

export type SuggestionsProps = ComponentProps<typeof ScrollArea>

export const Suggestions = ({
  className,
  children,
  ...props
}: SuggestionsProps) => (
  <ScrollArea
    data-slot="suggestions"
    className="w-full overflow-x-auto whitespace-nowrap"
    {...props}
  >
    <div className={cn("flex w-max flex-nowrap items-center gap-2", className)}>
      {children}
    </div>
    <ScrollBar className="hidden" orientation="horizontal" />
  </ScrollArea>
)

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string
  onClick?: (suggestion: string) => void
}

export const Suggestion = ({
  suggestion,
  onClick,
  className,
  children,
  ...props
}: SuggestionProps) => {
  const handleClick = () => {
    onClick?.(suggestion)
  }

  return (
    <Button
      data-slot="suggestion"
      className={cn(
        "cursor-pointer rounded-md px-3.5 py-2 text-sm font-sans hover:border-foreground/40 transition-colors h-auto",
        className
      )}
      onClick={handleClick}
      type="button"
      variant="outline"
      {...props}
    >
      {children || suggestion}
    </Button>
  )
}

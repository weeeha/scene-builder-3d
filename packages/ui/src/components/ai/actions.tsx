"use client"

import { Button } from "@weeeha/ui/components/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@weeeha/ui/components/tooltip"
import { cn } from "@weeeha/ui/lib/utils"
import type { ComponentProps } from "react"

export type ActionsProps = ComponentProps<"div">

/**
 * A flex row container for per-message action icon-buttons.
 */
export const Actions = ({
  className,
  children,
  ...props
}: ActionsProps) => (
  <div
    data-slot="actions"
    className={cn("flex items-center gap-0.5", className)}
    {...props}
  >
    {children}
  </div>
)

export type ActionProps = ComponentProps<typeof Button> & {
  /** Tooltip text shown on hover. Also used as aria-label. */
  tooltip?: string
  /** Accessible label override (falls back to tooltip). */
  label?: string
}

/**
 * A single ghost icon-button action. Wrap inside <Actions>.
 * Pass `tooltip` to get a Tooltip automatically.
 */
export const Action = ({
  tooltip,
  label,
  children,
  className,
  variant = "ghost",
  size = "icon-sm",
  ...props
}: ActionProps) => {
  const button = (
    <Button
      data-slot="action"
      className={cn(className)}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children}
      {(label ?? tooltip) && (
        <span className="sr-only">{label ?? tooltip}</span>
      )}
    </Button>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return button
}

"use client"

import { Button } from "@weeeha/ui/components/button"
import { Separator } from "@weeeha/ui/components/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@weeeha/ui/components/tooltip"
import { cn } from "@weeeha/ui/lib/utils"
import { ClockIcon } from "./_icons.js"
import type { ComponentProps } from "react"

// ---------------------------------------------------------------------------
// Checkpoint — conversation restore-point marker / divider
// ---------------------------------------------------------------------------

export type CheckpointProps = ComponentProps<"div">

export const Checkpoint = ({
  className,
  children,
  ...props
}: CheckpointProps) => (
  <div
    data-slot="checkpoint"
    className={cn(
      "flex items-center gap-0.5 overflow-hidden text-muted-foreground",
      className
    )}
    {...props}
  >
    {children}
    <Separator />
  </div>
)

// ---------------------------------------------------------------------------
// CheckpointIcon — icon slot (defaults to ClockIcon as restore-point glyph)
// ---------------------------------------------------------------------------

export type CheckpointIconProps = ComponentProps<"span"> & {
  className?: string
}

export const CheckpointIcon = ({
  className,
  children,
  ...props
}: CheckpointIconProps) =>
  children ? (
    <span data-slot="checkpoint-icon" className={cn("shrink-0", className)} {...props}>
      {children}
    </span>
  ) : (
    <span data-slot="checkpoint-icon" className={cn("shrink-0", className)} {...props}>
      <ClockIcon className="size-4" />
    </span>
  )

// ---------------------------------------------------------------------------
// CheckpointTrigger — button with optional tooltip
// ---------------------------------------------------------------------------

export type CheckpointTriggerProps = ComponentProps<typeof Button> & {
  /** Tooltip text shown on hover. Also used as the sr-only fallback label. */
  tooltip?: string
  /** Accessible label override (falls back to tooltip). */
  label?: string
}

export const CheckpointTrigger = ({
  children,
  className,
  variant = "ghost",
  size = "sm",
  tooltip,
  label,
  ...props
}: CheckpointTriggerProps) => {
  const button = (
    <Button
      data-slot="checkpoint-trigger"
      size={size}
      type="button"
      variant={variant}
      className={className}
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
          <TooltipContent align="start" side="bottom">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return button
}

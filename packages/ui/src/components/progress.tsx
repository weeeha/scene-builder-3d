"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@weeeha/ui/lib/utils"

function Progress({
  className,
  value,
  max = 100,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  // Radix treats an invalid max as 100; the fill must use the same fallback
  // or the announced ratio and the painted ratio disagree.
  const scale = max > 0 ? max : 100
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      max={max}
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="size-full flex-1 bg-primary transition-all"
        style={{
          transform: `translateX(-${100 - ((value ?? 0) / scale) * 100}%)`,
        }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }

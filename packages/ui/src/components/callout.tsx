import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@weeeha/ui/lib/utils"

const calloutVariants = cva(
  "rounded-md border-s-2 bg-surface-secondary/40 px-4 py-3 text-sm",
  {
    variants: {
      tone: {
        neutral: "border-s-button-primary",
        info: "border-s-accent-info",
        warning: "border-s-accent-alert bg-accent-alert/5",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
)

type CalloutProps = React.ComponentProps<"div"> &
  VariantProps<typeof calloutVariants>

function Callout({ className, tone, ...props }: CalloutProps) {
  return (
    <div
      data-slot="callout"
      role="note"
      className={cn(calloutVariants({ tone }), className)}
      {...props}
    />
  )
}

function CalloutTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="callout-title"
      className={cn("mb-0.5 font-medium", className)}
      {...props}
    />
  )
}

export { Callout, CalloutTitle }
export type { CalloutProps }

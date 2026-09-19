import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@weeeha/ui/lib/utils"

const indicatorVariants = cva(
  "inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[11px] font-bold leading-none",
  {
    variants: {
      agreement: {
        // Corroboration ladder: ink steps down with source count — strong
        // green border (all agree) → soft green border (majority) → neutral
        // outline (uncorroborated single source).
        "all-agree":
          "border border-status-approved bg-status-approved-soft text-status-approved",
        majority:
          "border border-status-approved-border bg-status-approved-soft text-status-approved",
        "single-source": "border border-border text-muted-foreground",
        conflict:
          "border border-status-action-border bg-status-action-soft text-accent-alert",
        "no-data": "text-muted-foreground",
      },
    },
    defaultVariants: { agreement: "all-agree" },
  }
)

const GLYPH = {
  "all-agree": "✓",
  majority: "✓",
  "single-source": "1",
  conflict: "!",
  "no-data": "·",
} as const

const DEFAULT_LABEL = {
  "all-agree": "Sources agree",
  majority: "Sources agree (with one outlier)",
  "single-source": "Single source",
  conflict: "Sources disagree",
  "no-data": "No data yet",
} as const

export type AgreementIndicatorProps = React.ComponentProps<"span"> &
  VariantProps<typeof indicatorVariants> & {
    agreement: NonNullable<VariantProps<typeof indicatorVariants>["agreement"]>
  }

/**
 * Visual pill indicating fact-agreement state — "do the sources for this
 * measurement agree?" Semantically distinct from SeverityPill which
 * indicates rule-severity ("how important is this rule?").
 */
export function AgreementIndicator({
  agreement,
  className,
  "aria-label": ariaLabel,
  ...props
}: AgreementIndicatorProps) {
  return (
    <span
      role="img"
      aria-label={ariaLabel ?? DEFAULT_LABEL[agreement]}
      className={cn(indicatorVariants({ agreement }), className)}
      {...props}
    >
      {GLYPH[agreement]}
    </span>
  )
}

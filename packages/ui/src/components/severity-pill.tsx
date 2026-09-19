import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@weeeha/ui/lib/utils"

const severityPillVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      severity: {
        blocking:
          "bg-destructive/10 text-destructive border-destructive/30 dark:bg-destructive/20",
        warning:
          "bg-status-pending-soft text-status-pending border-status-pending-border",
        info: "bg-muted text-muted-foreground border-border",
        review:
          "bg-accent-info/10 text-accent-info border-accent-info/30",
      },
    },
    defaultVariants: {
      severity: "info",
    },
  }
)

const SEVERITY_LABELS: Record<NonNullable<SeverityPillProps["severity"]>, string> = {
  blocking: "Blocking",
  warning: "Warning",
  info: "Info",
  review: "Review",
}

type SeverityPillProps = React.ComponentProps<"span"> & VariantProps<typeof severityPillVariants>

function SeverityPill({
  className,
  severity = "info",
  children,
  ...props
}: SeverityPillProps) {
  return (
    <span
      data-slot="severity-pill"
      data-severity={severity}
      className={cn(severityPillVariants({ severity }), className)}
      {...props}
    >
      {children ?? SEVERITY_LABELS[severity ?? "info"]}
    </span>
  )
}

export { SeverityPill, severityPillVariants }

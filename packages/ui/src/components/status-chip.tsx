import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import {
  Check,
  LoaderCircle,
  Minus,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@weeeha/ui/lib/utils"

/**
 * Checklist status vocabulary. The accent ("passed") is reserved for
 * machine-validated items — self-reported states stay neutral gray.
 */
type StatusChipStatus =
  | "required"
  | "received"
  | "ready"
  | "checking"
  | "passed"
  | "flagged"
  | "waived"

const chip = cva(
  "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-4 [&_svg]:size-3",
  {
    variants: {
      status: {
        required: "border-status-action-border bg-status-action-soft text-status-action",
        received: "border-border bg-surface-secondary text-text-secondary",
        ready: "border-border bg-surface-secondary text-text-secondary",
        checking: "border-border bg-surface-secondary text-text-secondary",
        passed: "border-status-approved-border bg-status-approved-soft text-status-approved",
        flagged: "border-status-pending-border bg-status-pending-soft text-status-action",
        waived: "border-border bg-surface-card text-text-secondary",
      },
    },
    defaultVariants: { status: "required" },
  }
)

const DEFAULT_LABELS: Record<StatusChipStatus, string> = {
  required: "Required",
  received: "Received · not checked",
  ready: "Marked ready by you",
  checking: "Checking…",
  passed: "Checked · complete",
  flagged: "Issues found",
  waived: "N/A — waived",
}

const ICONS: Partial<Record<StatusChipStatus, LucideIcon>> = {
  ready: Check,
  checking: LoaderCircle,
  passed: Check,
  flagged: TriangleAlert,
  waived: Minus,
}

interface StatusChipProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof chip> {
  status: StatusChipStatus
}

function StatusChip({ className, status, children, ...props }: StatusChipProps) {
  const Icon = ICONS[status]
  return (
    <span data-slot="status-chip" className={cn(chip({ status }), className)} {...props}>
      {Icon ? (
        <Icon
          className={status === "checking" ? "animate-spin" : undefined}
          aria-hidden
        />
      ) : null}
      {children ?? DEFAULT_LABELS[status]}
    </span>
  )
}

export { StatusChip, type StatusChipStatus }

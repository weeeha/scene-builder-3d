"use client"

import * as React from "react"
import {
  Check,
  File,
  LoaderCircle,
  Minus,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@weeeha/ui/lib/utils"
import {
  StatusChip,
  type StatusChipStatus,
} from "@weeeha/ui/components/status-chip"

/**
 * One required document in the project checklist — the seam where the AI
 * package checker lands: its state machine (required → received → checking →
 * passed/flagged, plus ready/waived) is the submission-outcome vocabulary.
 */
const GLYPHS: Record<
  StatusChipStatus,
  { icon: LucideIcon | null; className: string }
> = {
  required: { icon: null, className: "" },
  received: { icon: File, className: "text-text-secondary" },
  ready: { icon: Check, className: "text-text-secondary" },
  checking: { icon: LoaderCircle, className: "animate-spin text-text-secondary" },
  passed: { icon: Check, className: "text-status-approved" },
  flagged: { icon: TriangleAlert, className: "text-status-action" },
  waived: { icon: Minus, className: "text-text-secondary" },
}

interface ChecklistItemProps extends Omit<React.ComponentProps<"div">, "title"> {
  status: StatusChipStatus
  title: string
  /** Row-level chip label override (e.g. "2 issues found"). */
  chipLabel?: string
  /** Trailing row action, e.g. an Upload button. */
  action?: React.ReactNode
  /** Expanded detail block (description, UploadZone, file row, fix callout…). */
  children?: React.ReactNode
  /** Initial expansion when uncontrolled. */
  defaultExpanded?: boolean
  /** Controlled expansion — pair with `onExpandedChange`. Omit both and the row manages its own state. */
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

function ChecklistItem({
  className,
  status,
  title,
  chipLabel,
  action,
  children,
  defaultExpanded = false,
  expanded: expandedProp,
  onExpandedChange,
  ...props
}: ChecklistItemProps) {
  const glyph = GLYPHS[status]
  const expandable = !!children
  const panelId = React.useId()
  const [uncontrolledExpanded, setUncontrolledExpanded] =
    React.useState(defaultExpanded)
  const expanded = expandedProp ?? uncontrolledExpanded
  const toggleExpanded = () => {
    if (expandedProp === undefined) setUncontrolledExpanded(!expanded)
    onExpandedChange?.(!expanded)
  }
  return (
    <div
      data-slot="checklist-item"
      data-status={status}
      className={cn("flex flex-col border-b border-border bg-surface-card", className)}
      {...props}
    >
      <div
        role={expandable ? "button" : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={expandable ? expanded : undefined}
        aria-controls={expandable ? panelId : undefined}
        onClick={expandable ? toggleExpanded : undefined}
        onKeyDown={
          expandable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  // preventDefault: Space would otherwise also scroll the page.
                  e.preventDefault()
                  toggleExpanded()
                }
              }
            : undefined
        }
        className={cn(
          "flex items-center gap-3 px-4 py-3",
          expandable && "cursor-pointer"
        )}
      >
        <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
          {glyph.icon ? (
            <glyph.icon className={glyph.className} aria-hidden />
          ) : (
            <span className="size-3.5 rounded-full border-[1.5px] border-text-secondary" aria-hidden />
          )}
        </span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-medium leading-5",
            status === "waived" ? "text-text-secondary" : "text-text-primary"
          )}
        >
          {title}
        </span>
        <StatusChip status={status}>{chipLabel}</StatusChip>
        {action}
      </div>
      {expandable && expanded ? (
        <div id={panelId} className="flex flex-col gap-3 pb-4 pl-11 pr-4">
          {children}
        </div>
      ) : null}
    </div>
  )
}

export { ChecklistItem }

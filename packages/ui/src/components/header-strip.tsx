"use client"

import * as React from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@weeeha/ui/lib/utils"

/**
 * The questionnaire verdict, matured: full result card on first visit,
 * collapsed one-line strip on return visits ("Living Result" page hero).
 */
interface HeaderStripProps extends Omit<React.ComponentProps<"div">, "title"> {
  title: string
  /** One-line meta, e.g. "Design Systems · est. 6 pts · 2–3 weeks". */
  meta: string
  stats?: { label: string; value: string }[]
  /** Footer note, e.g. "Based on your answers · Jun 23". */
  note?: string
  /** Footer link/action slot, e.g. "View my answers →". */
  footerAction?: React.ReactNode
  /** Initial expansion when uncontrolled. */
  defaultExpanded?: boolean
  /** Controlled expansion — pair with `onExpandedChange`. */
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

function HeaderStrip({
  className,
  title,
  meta,
  stats,
  note,
  footerAction,
  defaultExpanded = false,
  expanded: expandedProp,
  onExpandedChange,
  ...props
}: HeaderStripProps) {
  const [uncontrolledExpanded, setUncontrolledExpanded] =
    React.useState(defaultExpanded)
  const expanded = expandedProp ?? uncontrolledExpanded
  const panelId = React.useId()
  const toggleExpanded = () => {
    if (expandedProp === undefined) setUncontrolledExpanded(!expanded)
    onExpandedChange?.(!expanded)
  }
  const hasDetails = !!(stats?.length || note || footerAction)
  return (
    <div
      data-slot="header-strip"
      className={cn("flex flex-col rounded-2xl border border-border bg-surface-card", className)}
      {...props}
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-5 text-text-primary">{title}</p>
          <p className="truncate text-xs leading-4 text-text-secondary">{meta}</p>
        </div>
        {hasDetails ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={toggleExpanded}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium leading-5 text-text-accent [&_svg]:size-3.5"
          >
            {expanded ? "Hide details" : "Details"}
            {expanded ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
          </button>
        ) : null}
      </div>
      {hasDetails && expanded ? (
        <div
          id={panelId}
          className="flex flex-col gap-2.5 border-t border-border p-4"
        >
          {/* index keys: rows are positional display data; labels may repeat */}
          {stats?.map((s, index) => (
            <div key={index} className="flex gap-3 text-[13px] leading-5">
              <span className="w-45 shrink-0 text-text-secondary">{s.label}</span>
              <span className="font-medium text-text-primary">{s.value}</span>
            </div>
          ))}
          {note || footerAction ? (
            <div className="flex items-center gap-3 pt-1 text-xs leading-4">
              {note ? <span className="text-text-secondary">{note}</span> : null}
              {footerAction}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export { HeaderStrip }

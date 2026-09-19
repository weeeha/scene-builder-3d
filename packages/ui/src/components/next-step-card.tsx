import * as React from "react"

import { cn } from "@weeeha/ui/lib/utils"

/**
 * The pinned "your next step" card — derived from the first incomplete
 * checklist item, it is the single action the page always leads with.
 */
interface NextStepCardProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** Eyebrow label; defaults to "Your next step". */
  eyebrow?: string
  title: string
  description?: string
  /** Trailing action slot, e.g. an Upload button. */
  action?: React.ReactNode
}

function NextStepCard({
  className,
  eyebrow = "Your next step",
  title,
  description,
  action,
  ...props
}: NextStepCardProps) {
  return (
    <div
      data-slot="next-step-card"
      className={cn(
        "flex items-center gap-4 overflow-hidden rounded-2xl border border-status-approved-border border-l-4 border-l-accent-bold bg-status-approved-soft py-4 pl-4 pr-4",
        className
      )}
      {...props}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase leading-4 tracking-wide text-status-approved">
          {eyebrow}
        </p>
        <p className="mt-0.5 text-[15px] font-medium leading-5 text-text-primary">{title}</p>
        {description ? (
          <p className="mt-1 text-[13px] leading-5 text-text-secondary">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export { NextStepCard }

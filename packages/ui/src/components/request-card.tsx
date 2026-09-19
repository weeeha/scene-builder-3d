import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@weeeha/ui/lib/utils"

const requestCardVariants = cva("w-full", {
  variants: {
    variant: {
      card: "rounded-[var(--qf-card-radius,16px)] border bg-surface-card p-6 shadow-2xs",
      surface: "rounded-[var(--qf-card-radius,16px)] bg-surface-secondary/50 p-6",
      ghost: "p-0",
    },
  },
  defaultVariants: { variant: "card" },
})

type RequestCardProps = React.ComponentProps<"div"> &
  VariantProps<typeof requestCardVariants>

function RequestCard({ className, variant, ...props }: RequestCardProps) {
  return (
    <div
      data-slot="request-card"
      className={cn(requestCardVariants({ variant }), className)}
      {...props}
    />
  )
}

function RequestCardTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="request-card-title"
      className={cn("mb-4 text-2xl font-semibold text-text-primary", className)}
      {...props}
    />
  )
}

function RequestCardChips({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="request-card-chips"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  )
}

function RequestCardChip({
  className,
  children,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="request-card-chip"
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-lg bg-surface-secondary px-2.5 text-xs font-medium text-text-primary [&_svg]:size-4 [&_svg]:text-text-secondary",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/**
 * "Links" variant — renders the request items as one line of comma-separated
 * accent-coloured links instead of chips. Commas are inserted automatically
 * between children, so callers only supply the RequestCardLink items.
 */
function RequestCardLinks({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const items = React.Children.toArray(children).filter(Boolean)
  return (
    <div
      data-slot="request-card-links"
      className={cn(
        "text-base font-medium leading-snug text-text-accent",
        className
      )}
      {...props}
    >
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {child}
          {i < items.length - 1 ? <span aria-hidden>, </span> : null}
        </React.Fragment>
      ))}
    </div>
  )
}

type RequestCardLinkProps = React.ComponentProps<"button"> & {
  /**
   * What activating the link does, e.g. "view request details" — appended as
   * visually-hidden text so the accessible name says more than the bare value
   * ("v2.4"). Prefer this over `aria-label`, which would replace the value.
   */
  srAction?: string
}

function RequestCardLink({
  className,
  children,
  srAction,
  ...props
}: RequestCardLinkProps) {
  return (
    <button
      type="button"
      data-slot="request-card-link"
      className={cn(
        "inline text-text-accent underline-offset-2 transition-colors hover:underline focus-visible:underline focus-visible:outline-none disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      {children}
      {srAction ? <span className="sr-only">, {srAction}</span> : null}
    </button>
  )
}

export {
  RequestCard,
  RequestCardTitle,
  RequestCardChips,
  RequestCardChip,
  RequestCardLinks,
  RequestCardLink,
}
export type { RequestCardProps }

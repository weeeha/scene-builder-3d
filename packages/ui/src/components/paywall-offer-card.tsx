import * as React from "react"
import { Check, PartyPopper } from "lucide-react"

import { cn } from "@weeeha/ui/lib/utils"

/**
 * The paywall seam of the free-visible / paid-actionable checklist.
 * `nudge` = quiet mid-gathering prompt; `celebration` = the 7-of-7 moment
 * (card capture at peak value, TurboTax-style). Always pair with a real
 * "skip — submit as-is" path.
 */
interface PaywallOfferCardProps extends Omit<React.ComponentProps<"div">, "title"> {
  variant?: "nudge" | "celebration"
  title?: string
  description?: string
  benefits?: string[]
  /** Primary CTA slot, e.g. a Button. */
  action?: React.ReactNode
  /** Secondary dismiss/skip slot, e.g. "Skip — submit as-is →". */
  skipAction?: React.ReactNode
}

function PaywallOfferCard({
  className,
  variant = "nudge",
  title,
  description,
  benefits,
  action,
  skipAction,
  children,
  ...props
}: PaywallOfferCardProps) {
  if (variant === "nudge") {
    return (
      <div
        data-slot="paywall-offer-card"
        data-variant="nudge"
        className={cn(
          "flex items-center gap-4 rounded-2xl border border-border bg-surface-secondary px-4 py-3.5",
          className
        )}
        {...props}
      >
        <p className="min-w-0 flex-1 text-sm leading-5 text-text-primary">
          {children ?? description}
        </p>
        {action || skipAction ? (
          <div className="flex shrink-0 items-center gap-4">
            {action}
            {skipAction}
          </div>
        ) : null}
      </div>
    )
  }
  return (
    <div
      data-slot="paywall-offer-card"
      data-variant="celebration"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-status-approved-border bg-status-approved-soft p-6",
        className
      )}
      {...props}
    >
      <p className="inline-flex items-center gap-2 text-lg font-medium leading-6 text-text-primary [&_svg]:size-5 [&_svg]:text-status-approved">
        <PartyPopper aria-hidden />
        {title}
      </p>
      {description ? (
        <p className="text-sm leading-5 text-text-secondary">{description}</p>
      ) : null}
      {benefits?.length ? (
        <ul className="flex flex-col gap-1.5">
          {benefits.map((b) => (
            <li
              key={b}
              className="inline-flex items-center gap-2 text-[13px] leading-5 text-text-primary [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-status-approved"
            >
              <Check aria-hidden />
              {b}
            </li>
          ))}
        </ul>
      ) : null}
      {children}
      {action || skipAction ? (
        <div className="flex items-center gap-4 pt-1">
          {action}
          {skipAction}
        </div>
      ) : null}
    </div>
  )
}

export { PaywallOfferCard }

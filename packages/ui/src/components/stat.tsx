import * as React from "react"

import { cn } from "@weeeha/ui/lib/utils"

function StatGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-group"
      className={cn("grid gap-4 sm:grid-cols-2", className)}
      {...props}
    />
  )
}

type StatProps = React.ComponentProps<"div">

function Stat({ className, ...props }: StatProps) {
  return (
    <div
      data-slot="stat"
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl border bg-surface-card p-6 text-center",
        className
      )}
      {...props}
    />
  )
}

function StatLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-label"
      className={cn(
        "text-text-secondary text-xs font-medium tracking-wide uppercase",
        className
      )}
      {...props}
    />
  )
}

function StatValue({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-value"
      className={cn("text-2xl font-semibold tracking-tight", className)}
      {...props}
    />
  )
}

function StatDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-description"
      className={cn("text-text-secondary text-sm", className)}
      {...props}
    />
  )
}

export { StatGroup, Stat, StatLabel, StatValue, StatDescription }
export type { StatProps }

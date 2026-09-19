import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@weeeha/ui/lib/utils"

function Steps({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol data-slot="steps" className={cn("flex flex-col", className)} {...props} />
  )
}

const stepIndicatorVariants = cva(
  "flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-medium",
  {
    variants: {
      status: {
        upcoming: "border-border text-text-secondary",
        current: "border-button-primary bg-button-primary/10 text-text-accent",
        done: "border-button-primary bg-button-primary text-text-inverted",
      },
    },
    defaultVariants: { status: "upcoming" },
  }
)

type StepsProps = React.ComponentProps<"ol">

type StepProps = React.ComponentProps<"li"> &
  VariantProps<typeof stepIndicatorVariants> & { index?: number }

function Step({ className, status, index, children, ...props }: StepProps) {
  return (
    <li data-slot="step" className={cn("flex gap-3 py-2", className)} {...props}>
      <span
        data-slot="step-indicator"
        className={cn(stepIndicatorVariants({ status }))}
      >
        {index}
      </span>
      <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">{children}</div>
    </li>
  )
}

function StepTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="step-title" className={cn("text-sm", className)} {...props} />
  )
}

function StepDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="step-description"
      className={cn("text-text-secondary text-sm", className)}
      {...props}
    />
  )
}

export { Steps, Step, StepTitle, StepDescription }
export type { StepsProps, StepProps }

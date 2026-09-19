"use client"

import { Button } from "@weeeha/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@weeeha/ui/components/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@weeeha/ui/components/collapsible"
import { cn } from "@weeeha/ui/lib/utils"
import { ChevronsUpDownIcon } from "./_icons.js"
import type { ComponentProps } from "react"
import { createContext, useContext } from "react"
import { Shimmer } from "./shimmer.js"

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type PlanContextValue = {
  isStreaming: boolean
}

const PlanContext = createContext<PlanContextValue | null>(null)

const usePlan = () => {
  const context = useContext(PlanContext)
  if (!context) {
    throw new Error("Plan components must be used within Plan")
  }
  return context
}

// ---------------------------------------------------------------------------
// Plan — collapsible card container
// ---------------------------------------------------------------------------

export type PlanProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean
}

export const Plan = ({
  className,
  isStreaming = false,
  children,
  ...props
}: PlanProps) => (
  <PlanContext.Provider value={{ isStreaming }}>
    <Collapsible asChild data-slot="plan" {...props}>
      <Card className={cn("shadow-none", className)}>{children}</Card>
    </Collapsible>
  </PlanContext.Provider>
)

// ---------------------------------------------------------------------------
// PlanHeader
// ---------------------------------------------------------------------------

export type PlanHeaderProps = ComponentProps<typeof CardHeader>

export const PlanHeader = ({ className, ...props }: PlanHeaderProps) => (
  <CardHeader
    data-slot="plan-header"
    className={cn("flex items-start justify-between", className)}
    {...props}
  />
)

// ---------------------------------------------------------------------------
// PlanTitle — shimmer-animated while streaming
// ---------------------------------------------------------------------------

export type PlanTitleProps = Omit<
  ComponentProps<typeof CardTitle>,
  "children"
> & {
  children: string
}

export const PlanTitle = ({ children, ...props }: PlanTitleProps) => {
  const { isStreaming } = usePlan()
  return (
    <CardTitle data-slot="plan-title" {...props}>
      {isStreaming ? <Shimmer>{children}</Shimmer> : children}
    </CardTitle>
  )
}

// ---------------------------------------------------------------------------
// PlanDescription
// ---------------------------------------------------------------------------

export type PlanDescriptionProps = Omit<
  ComponentProps<typeof CardDescription>,
  "children"
> & {
  children: string
}

export const PlanDescription = ({
  className,
  children,
  ...props
}: PlanDescriptionProps) => {
  const { isStreaming } = usePlan()
  return (
    <CardDescription
      data-slot="plan-description"
      className={cn("text-balance font-sans", className)}
      {...props}
    >
      {isStreaming ? <Shimmer>{children}</Shimmer> : children}
    </CardDescription>
  )
}

// ---------------------------------------------------------------------------
// PlanAction — top-right action slot (houses PlanTrigger)
// ---------------------------------------------------------------------------

export type PlanActionProps = ComponentProps<typeof CardAction>

export const PlanAction = (props: PlanActionProps) => (
  <CardAction data-slot="plan-action" {...props} />
)

// ---------------------------------------------------------------------------
// PlanContent — collapsible body
// ---------------------------------------------------------------------------

export type PlanContentProps = ComponentProps<typeof CardContent>

export const PlanContent = (props: PlanContentProps) => (
  <CollapsibleContent asChild>
    <CardContent data-slot="plan-content" {...props} />
  </CollapsibleContent>
)

// ---------------------------------------------------------------------------
// PlanFooter
// ---------------------------------------------------------------------------

export type PlanFooterProps = ComponentProps<typeof CardFooter>

export const PlanFooter = (props: PlanFooterProps) => (
  <CardFooter data-slot="plan-footer" {...props} />
)

// ---------------------------------------------------------------------------
// PlanTrigger — icon-only ghost button to toggle collapse
// ---------------------------------------------------------------------------

export type PlanTriggerProps = ComponentProps<typeof CollapsibleTrigger>

export const PlanTrigger = ({ className, ...props }: PlanTriggerProps) => (
  <CollapsibleTrigger asChild>
    <Button
      data-slot="plan-trigger"
      className={cn("size-8", className)}
      size="icon"
      variant="ghost"
      {...props}
    >
      <ChevronsUpDownIcon className="size-4" />
      <span className="sr-only">Toggle plan</span>
    </Button>
  </CollapsibleTrigger>
)

"use client"

import { Badge } from "@weeeha/ui/components/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@weeeha/ui/components/collapsible"
import { cn } from "@weeeha/ui/lib/utils"
import {
  AlertIcon,
  ChevronDownIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  LoaderIcon,
} from "./_icons.js"
import type { ToolUIPart } from "ai"
import type { ComponentProps, ReactNode } from "react"
import { isValidElement } from "react"

export type ToolProps = ComponentProps<typeof Collapsible>

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    data-slot="tool"
    className={cn("not-prose mb-4 w-full rounded-md border", className)}
    {...props}
  />
)

// ---------------------------------------------------------------------------
// State icon + badge
// ---------------------------------------------------------------------------

const getStateIcon = (state: ToolUIPart["state"]): ReactNode => {
  switch (state) {
    case "input-streaming":
      return (
        <LoaderIcon
          className="size-4 animate-spin text-muted-foreground"
        />
      )
    case "input-available":
      return (
        <ClockIcon
          className="size-4 animate-pulse text-muted-foreground"
        />
      )
    case "output-available":
      return (
        <CircleCheckIcon
          className="size-4 text-primary"
        />
      )
    case "output-error":
      return (
        <CircleXIcon
          className="size-4 text-destructive"
        />
      )
    case "output-denied":
      return (
        <CircleXIcon
          className="size-4 text-muted-foreground"
        />
      )
    case "approval-requested":
      return (
        <AlertIcon
          className="size-4 text-required animate-pulse"
        />
      )
    case "approval-responded":
      return (
        <CircleCheckIcon
          className="size-4 text-muted-foreground"
        />
      )
    default:
      return (
        <LoaderIcon
          className="size-4 animate-spin text-muted-foreground"
        />
      )
  }
}

const STATE_LABELS: Partial<Record<ToolUIPart["state"], string>> & Record<string, string> = {
  "input-streaming": "Pending",
  "input-available": "Running",
  "approval-requested": "Awaiting Approval",
  "approval-responded": "Responded",
  "output-available": "Completed",
  "output-error": "Error",
  "output-denied": "Denied",
}

const getStateBadgeVariant = (
  state: ToolUIPart["state"]
): "secondary" | "destructive" | "outline" => {
  if (state === "output-error" || state === "output-denied") return "destructive"
  if (state === "output-available") return "secondary"
  return "outline"
}

// ---------------------------------------------------------------------------
// ToolHeader
// ---------------------------------------------------------------------------

export type ToolHeaderProps = {
  title?: string
  type: ToolUIPart["type"]
  state: ToolUIPart["state"]
  className?: string
}

export const ToolHeader = ({
  className,
  title,
  type,
  state,
  ...props
}: ToolHeaderProps) => (
  <CollapsibleTrigger
    data-slot="tool-header"
    className={cn(
      "group flex w-full items-center justify-between gap-4 p-3",
      className
    )}
    {...props}
  >
    <div className="flex items-center gap-2">
      {getStateIcon(state)}
      <span className="font-sans font-medium text-sm">
        {title ?? String(type).split("-").slice(1).join("-")}
      </span>
      <Badge
        variant={getStateBadgeVariant(state)}
        className="gap-1.5 rounded-full text-xs"
      >
        {STATE_LABELS[state] ?? state}
      </Badge>
    </div>
    <ChevronDownIcon
      className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
    />
  </CollapsibleTrigger>
)

// ---------------------------------------------------------------------------
// ToolContent
// ---------------------------------------------------------------------------

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    data-slot="tool-content"
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
)

// ---------------------------------------------------------------------------
// ToolInput
// ---------------------------------------------------------------------------

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolUIPart["input"]
}

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-2 overflow-hidden p-4", className)} {...props}>
    <h4 className="font-sans font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="bg-muted rounded-lg p-3 text-sm">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all text-foreground text-xs">
        {JSON.stringify(input, null, 2)}
      </pre>
    </div>
  </div>
)

// ---------------------------------------------------------------------------
// ToolOutput
// ---------------------------------------------------------------------------

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolUIPart["output"]
  errorText: ToolUIPart["errorText"]
}

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null
  }

  const renderOutput = () => {
    if (errorText) {
      return (
        <div className="bg-destructive/10 rounded-lg p-3 text-sm text-destructive">
          {errorText}
        </div>
      )
    }

    if (typeof output === "object" && !isValidElement(output)) {
      return (
        <div className="bg-muted rounded-lg p-3 text-sm">
          <pre className="overflow-x-auto whitespace-pre-wrap break-all text-foreground text-xs">
            {JSON.stringify(output, null, 2)}
          </pre>
        </div>
      )
    }

    if (typeof output === "string") {
      return (
        <div className="bg-muted rounded-lg p-3 text-sm text-foreground">
          {output}
        </div>
      )
    }

    return (
      <div className="bg-muted rounded-lg p-3 text-sm text-foreground">
        {output as ReactNode}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2 p-4", className)} {...props}>
      <h4 className="font-sans font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Error" : "Result"}
      </h4>
      {renderOutput()}
    </div>
  )
}

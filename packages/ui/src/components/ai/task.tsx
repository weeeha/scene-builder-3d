"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@weeeha/ui/components/collapsible"
import { cn } from "@weeeha/ui/lib/utils"
import { ChevronDownIcon, SearchIcon } from "./_icons.js"
import type { ComponentProps } from "react"

// ---------------------------------------------------------------------------
// TaskItemFile — inline file/path chip
// ---------------------------------------------------------------------------

export type TaskItemFileProps = ComponentProps<"div">

export const TaskItemFile = ({
  children,
  className,
  ...props
}: TaskItemFileProps) => (
  <div
    data-slot="task-item-file"
    className={cn(
      "inline-flex items-center gap-1 rounded-md border bg-secondary px-1.5 py-0.5 text-foreground text-xs",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

// ---------------------------------------------------------------------------
// TaskItem — single step row
// ---------------------------------------------------------------------------

export type TaskItemProps = ComponentProps<"div">

export const TaskItem = ({ children, className, ...props }: TaskItemProps) => (
  <div
    data-slot="task-item"
    className={cn("font-sans text-muted-foreground text-sm", className)}
    {...props}
  >
    {children}
  </div>
)

// ---------------------------------------------------------------------------
// Task — collapsible wrapper
// ---------------------------------------------------------------------------

export type TaskProps = ComponentProps<typeof Collapsible>

export const Task = ({
  defaultOpen = true,
  className,
  ...props
}: TaskProps) => (
  <Collapsible
    data-slot="task"
    className={cn(className)}
    defaultOpen={defaultOpen}
    {...props}
  />
)

// ---------------------------------------------------------------------------
// TaskTrigger — header row with title + chevron
// ---------------------------------------------------------------------------

export type TaskTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  title: string
}

export const TaskTrigger = ({
  children,
  className,
  title,
  ...props
}: TaskTriggerProps) => (
  <CollapsibleTrigger
    asChild
    data-slot="task-trigger"
    className={cn("group", className)}
    {...props}
  >
    {children ?? (
      <button
        className="flex w-full cursor-pointer items-center gap-2 rounded-md text-muted-foreground text-sm outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        type="button"
      >
        <SearchIcon className="size-4 shrink-0" />
        <span className="font-sans text-sm">{title}</span>
        <ChevronDownIcon
          className="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180"
        />
      </button>
    )}
  </CollapsibleTrigger>
)

// ---------------------------------------------------------------------------
// TaskContent — animated collapsible body
// ---------------------------------------------------------------------------

export type TaskContentProps = ComponentProps<typeof CollapsibleContent>

export const TaskContent = ({
  children,
  className,
  ...props
}: TaskContentProps) => (
  <CollapsibleContent
    data-slot="task-content"
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  >
    <div className="mt-4 space-y-2 border-muted border-l-2 pl-4">
      {children}
    </div>
  </CollapsibleContent>
)

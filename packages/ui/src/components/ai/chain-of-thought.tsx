"use client"

import { useControllableState } from "@radix-ui/react-use-controllable-state"
import { Badge } from "@weeeha/ui/components/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@weeeha/ui/components/collapsible"
import { cn } from "@weeeha/ui/lib/utils"
import type { LucideIcon } from "lucide-react"
import { BrainIcon, ChevronDownIcon, DotIcon } from "./_icons.js"
import type { ComponentProps, ReactNode } from "react"
import { createContext, memo, useContext, useMemo } from "react"

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type ChainOfThoughtContextValue = {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

const ChainOfThoughtContext = createContext<ChainOfThoughtContextValue | null>(
  null
)

const useChainOfThought = () => {
  const context = useContext(ChainOfThoughtContext)
  if (!context) {
    throw new Error(
      "ChainOfThought components must be used within ChainOfThought"
    )
  }
  return context
}

// ---------------------------------------------------------------------------
// ChainOfThought — root wrapper
// ---------------------------------------------------------------------------

export type ChainOfThoughtProps = ComponentProps<"div"> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export const ChainOfThought = memo(
  ({
    className,
    open,
    defaultOpen = false,
    onOpenChange,
    children,
    ...props
  }: ChainOfThoughtProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    })

    const chainOfThoughtContext = useMemo(
      () => ({ isOpen: isOpen ?? defaultOpen, setIsOpen }),
      [isOpen, defaultOpen, setIsOpen]
    )

    return (
      <ChainOfThoughtContext.Provider value={chainOfThoughtContext}>
        <div
          data-slot="chain-of-thought"
          className={cn("not-prose max-w-prose space-y-4", className)}
          {...props}
        >
          {children}
        </div>
      </ChainOfThoughtContext.Provider>
    )
  }
)

// ---------------------------------------------------------------------------
// ChainOfThoughtHeader — collapsible trigger with brain icon
// ---------------------------------------------------------------------------

export type ChainOfThoughtHeaderProps = ComponentProps<typeof CollapsibleTrigger>

export const ChainOfThoughtHeader = memo(
  ({ className, children, ...props }: ChainOfThoughtHeaderProps) => {
    const { isOpen, setIsOpen } = useChainOfThought()

    return (
      <Collapsible onOpenChange={setIsOpen} open={isOpen}>
        <CollapsibleTrigger
          data-slot="chain-of-thought-header"
          className={cn(
            "flex w-full items-center gap-2 font-sans text-muted-foreground text-sm transition-colors hover:text-foreground",
            className
          )}
          {...props}
        >
          <BrainIcon className="size-4 shrink-0" />
          <span className="flex-1 text-left">
            {children ?? "Chain of Thought"}
          </span>
          <ChevronDownIcon
            className={cn(
              "size-4 shrink-0 transition-transform",
              isOpen ? "rotate-180" : "rotate-0"
            )}
          />
        </CollapsibleTrigger>
      </Collapsible>
    )
  }
)

// ---------------------------------------------------------------------------
// ChainOfThoughtStep — individual step in the timeline
// ---------------------------------------------------------------------------

export type ChainOfThoughtStepProps = ComponentProps<"div"> & {
  icon?: LucideIcon
  label: ReactNode
  description?: ReactNode
  status?: "complete" | "active" | "pending"
}

export const ChainOfThoughtStep = memo(
  ({
    className,
    icon,
    label,
    description,
    status = "complete",
    children,
    ...props
  }: ChainOfThoughtStepProps) => {
    const statusStyles = {
      complete: "text-muted-foreground",
      active: "text-foreground",
      pending: "text-muted-foreground/50",
    }

    const StepIcon = icon ?? DotIcon

    return (
      <div
        data-slot="chain-of-thought-step"
        className={cn(
          "flex gap-2 text-sm",
          statusStyles[status],
          "fade-in-0 slide-in-from-top-2 animate-in",
          className
        )}
        {...props}
      >
        <div className="relative mt-0.5">
          <StepIcon className="size-4" />
          <div className="-mx-px absolute top-7 bottom-0 left-1/2 w-px bg-border" />
        </div>
        <div className="flex-1 space-y-2 overflow-hidden">
          <div>{label}</div>
          {description && (
            <div className="text-muted-foreground text-xs">{description}</div>
          )}
          {children}
        </div>
      </div>
    )
  }
)

// ---------------------------------------------------------------------------
// ChainOfThoughtSearchResults / ChainOfThoughtSearchResult
// ---------------------------------------------------------------------------

export type ChainOfThoughtSearchResultsProps = ComponentProps<"div">

export const ChainOfThoughtSearchResults = memo(
  ({ className, ...props }: ChainOfThoughtSearchResultsProps) => (
    <div
      data-slot="chain-of-thought-search-results"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  )
)

export type ChainOfThoughtSearchResultProps = ComponentProps<typeof Badge>

export const ChainOfThoughtSearchResult = memo(
  ({ className, children, ...props }: ChainOfThoughtSearchResultProps) => (
    <Badge
      data-slot="chain-of-thought-search-result"
      className={cn("gap-1 px-2 py-0.5 font-normal text-xs", className)}
      variant="secondary"
      {...props}
    >
      {children}
    </Badge>
  )
)

// ---------------------------------------------------------------------------
// ChainOfThoughtContent — animated collapsible body
// ---------------------------------------------------------------------------

export type ChainOfThoughtContentProps = ComponentProps<typeof CollapsibleContent>

export const ChainOfThoughtContent = memo(
  ({ className, children, ...props }: ChainOfThoughtContentProps) => {
    const { isOpen } = useChainOfThought()

    return (
      <Collapsible open={isOpen}>
        <CollapsibleContent
          data-slot="chain-of-thought-content"
          className={cn(
            "mt-2 space-y-3",
            "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
            className
          )}
          {...props}
        >
          {children}
        </CollapsibleContent>
      </Collapsible>
    )
  }
)

// ---------------------------------------------------------------------------
// ChainOfThoughtImage — image with optional caption
// ---------------------------------------------------------------------------

export type ChainOfThoughtImageProps = ComponentProps<"div"> & {
  caption?: string
}

export const ChainOfThoughtImage = memo(
  ({ className, children, caption, ...props }: ChainOfThoughtImageProps) => (
    <div
      data-slot="chain-of-thought-image"
      className={cn("mt-2 space-y-2", className)}
      {...props}
    >
      <div className="relative flex max-h-[22rem] items-center justify-center overflow-hidden rounded-lg bg-muted p-3">
        {children}
      </div>
      {caption && <p className="text-muted-foreground text-xs">{caption}</p>}
    </div>
  )
)

ChainOfThought.displayName = "ChainOfThought"
ChainOfThoughtHeader.displayName = "ChainOfThoughtHeader"
ChainOfThoughtStep.displayName = "ChainOfThoughtStep"
ChainOfThoughtSearchResults.displayName = "ChainOfThoughtSearchResults"
ChainOfThoughtSearchResult.displayName = "ChainOfThoughtSearchResult"
ChainOfThoughtContent.displayName = "ChainOfThoughtContent"
ChainOfThoughtImage.displayName = "ChainOfThoughtImage"

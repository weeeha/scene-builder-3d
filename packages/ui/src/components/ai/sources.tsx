"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@weeeha/ui/components/collapsible"
import { cn } from "@weeeha/ui/lib/utils"
import { ChevronDownIcon, GlobeIcon, LinkIcon } from "./_icons.js"
import type { ComponentProps } from "react"

export type SourcesProps = ComponentProps<typeof Collapsible>

export const Sources = ({ className, ...props }: SourcesProps) => (
  <Collapsible
    data-slot="sources"
    className={cn("not-prose mb-4 text-xs", className)}
    {...props}
  />
)

export type SourcesTriggerProps = ComponentProps<typeof CollapsibleTrigger> & {
  count: number
}

export const SourcesTrigger = ({
  className,
  count,
  children,
  ...props
}: SourcesTriggerProps) => (
  <CollapsibleTrigger
    data-slot="sources-trigger"
    className={cn(
      "group flex items-center gap-2 font-sans text-muted-foreground transition-colors hover:text-foreground",
      className
    )}
    {...props}
  >
    {children ?? (
      <>
        <GlobeIcon className="size-4 shrink-0" />
        <span className="font-medium">
          Used {count} source{count === 1 ? "" : "s"}
        </span>
        <ChevronDownIcon
          className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180"
        />
      </>
    )}
  </CollapsibleTrigger>
)

export type SourcesContentProps = ComponentProps<typeof CollapsibleContent>

export const SourcesContent = ({
  className,
  ...props
}: SourcesContentProps) => (
  <CollapsibleContent
    data-slot="sources-content"
    className={cn(
      "mt-3 flex w-fit flex-col gap-2",
      "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
      className
    )}
    {...props}
  />
)

export type SourceProps = ComponentProps<"a">

export const Source = ({ href, title, children, ...props }: SourceProps) => (
  <a
    data-slot="source"
    className="flex items-center gap-2 font-sans text-primary underline underline-offset-2 hover:text-primary/80"
    href={href}
    rel="noreferrer"
    target="_blank"
    {...props}
  >
    {children ?? (
      <>
        <LinkIcon className="size-4 shrink-0 no-underline" />
        <span className="block font-medium">{title}</span>
      </>
    )}
  </a>
)

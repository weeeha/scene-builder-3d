"use client"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@weeeha/ui/components/command"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@weeeha/ui/components/dialog"
import { cn } from "@weeeha/ui/lib/utils"
import type { ComponentProps, ReactNode } from "react"

// ---------------------------------------------------------------------------
// ModelSelector — root Dialog wrapper
// ---------------------------------------------------------------------------

export type ModelSelectorProps = ComponentProps<typeof Dialog>

export const ModelSelector = (props: ModelSelectorProps) => (
  <Dialog {...props} />
)

// ---------------------------------------------------------------------------
// ModelSelectorTrigger — opens the dialog
// ---------------------------------------------------------------------------

export type ModelSelectorTriggerProps = ComponentProps<typeof DialogTrigger>

export const ModelSelectorTrigger = (props: ModelSelectorTriggerProps) => (
  <DialogTrigger {...props} />
)

// ---------------------------------------------------------------------------
// ModelSelectorContent — dialog frame wrapping Command palette
// ---------------------------------------------------------------------------

export type ModelSelectorContentProps = ComponentProps<typeof DialogContent> & {
  title?: ReactNode
}

export const ModelSelectorContent = ({
  className,
  children,
  title = "Model Selector",
  ...props
}: ModelSelectorContentProps) => (
  <DialogContent
    data-slot="model-selector-content"
    className={cn("p-0", className)}
    {...props}
  >
    <DialogTitle className="sr-only">{title}</DialogTitle>
    <Command className="**:data-[slot=command-input-wrapper]:h-auto">
      {children}
    </Command>
  </DialogContent>
)

// ---------------------------------------------------------------------------
// ModelSelectorDialog — standalone CommandDialog variant
// ---------------------------------------------------------------------------

export type ModelSelectorDialogProps = ComponentProps<typeof CommandDialog>

export const ModelSelectorDialog = (props: ModelSelectorDialogProps) => (
  <CommandDialog {...props} />
)

// ---------------------------------------------------------------------------
// ModelSelectorInput — search/filter field
// ---------------------------------------------------------------------------

export type ModelSelectorInputProps = ComponentProps<typeof CommandInput>

export const ModelSelectorInput = ({
  className,
  ...props
}: ModelSelectorInputProps) => (
  <CommandInput
    data-slot="model-selector-input"
    className={cn("h-auto py-3.5", className)}
    {...props}
  />
)

// ---------------------------------------------------------------------------
// ModelSelectorList — scrollable results container
// ---------------------------------------------------------------------------

export type ModelSelectorListProps = ComponentProps<typeof CommandList>

export const ModelSelectorList = (props: ModelSelectorListProps) => (
  <CommandList data-slot="model-selector-list" {...props} />
)

// ---------------------------------------------------------------------------
// ModelSelectorEmpty — empty state
// ---------------------------------------------------------------------------

export type ModelSelectorEmptyProps = ComponentProps<typeof CommandEmpty>

export const ModelSelectorEmpty = (props: ModelSelectorEmptyProps) => (
  <CommandEmpty data-slot="model-selector-empty" {...props} />
)

// ---------------------------------------------------------------------------
// ModelSelectorGroup — labelled group of model items
// ---------------------------------------------------------------------------

export type ModelSelectorGroupProps = ComponentProps<typeof CommandGroup>

export const ModelSelectorGroup = (props: ModelSelectorGroupProps) => (
  <CommandGroup data-slot="model-selector-group" {...props} />
)

// ---------------------------------------------------------------------------
// ModelSelectorItem — individual model row
// ---------------------------------------------------------------------------

export type ModelSelectorItemProps = ComponentProps<typeof CommandItem>

export const ModelSelectorItem = (props: ModelSelectorItemProps) => (
  <CommandItem data-slot="model-selector-item" {...props} />
)

// ---------------------------------------------------------------------------
// ModelSelectorShortcut — keyboard hint label
// ---------------------------------------------------------------------------

export type ModelSelectorShortcutProps = ComponentProps<typeof CommandShortcut>

export const ModelSelectorShortcut = (props: ModelSelectorShortcutProps) => (
  <CommandShortcut data-slot="model-selector-shortcut" {...props} />
)

// ---------------------------------------------------------------------------
// ModelSelectorSeparator — visual divider between groups
// ---------------------------------------------------------------------------

export type ModelSelectorSeparatorProps = ComponentProps<typeof CommandSeparator>

export const ModelSelectorSeparator = (props: ModelSelectorSeparatorProps) => (
  <CommandSeparator data-slot="model-selector-separator" {...props} />
)

// ---------------------------------------------------------------------------
// ModelSelectorLogo — provider logo from models.dev CDN
// ---------------------------------------------------------------------------

export type ModelSelectorLogoProps = ComponentProps<"img"> & {
  provider:
    | "anthropic"
    | "openai"
    | "google"
    | "google-vertex"
    | "amazon-bedrock"
    | "azure"
    | "mistral"
    | "groq"
    | "fireworks-ai"
    | "togetherai"
    | "deepseek"
    | "perplexity"
    | "huggingface"
    | "cloudflare-workers-ai"
    | "openrouter"
    | "vercel"
    | "llama"
    | "cerebras"
    | "xai"
    | (string & {})
}

export const ModelSelectorLogo = ({
  provider,
  className,
  // overridable: alt="" makes the mark decorative next to a visible name,
  // src swaps the models.dev CDN for a self-hosted asset
  src,
  alt,
  ...props
}: ModelSelectorLogoProps) => (
  <img
    {...props}
    alt={alt ?? `${provider} logo`}
    className={cn("size-3 dark:invert", className)}
    height={12}
    src={src ?? `https://models.dev/logos/${provider}.svg`}
    width={12}
  />
)

// ---------------------------------------------------------------------------
// ModelSelectorLogoGroup — stacked provider logo row
// ---------------------------------------------------------------------------

export type ModelSelectorLogoGroupProps = ComponentProps<"div">

export const ModelSelectorLogoGroup = ({
  className,
  ...props
}: ModelSelectorLogoGroupProps) => (
  <div
    data-slot="model-selector-logo-group"
    className={cn(
      "-space-x-1 flex shrink-0 items-center [&>img]:rounded-full [&>img]:bg-background [&>img]:p-px [&>img]:ring-1 dark:[&>img]:bg-foreground",
      className
    )}
    {...props}
  />
)

// ---------------------------------------------------------------------------
// ModelSelectorName — model display name, truncated
// ---------------------------------------------------------------------------

export type ModelSelectorNameProps = ComponentProps<"span">

export const ModelSelectorName = ({
  className,
  ...props
}: ModelSelectorNameProps) => (
  <span
    data-slot="model-selector-name"
    className={cn("flex-1 truncate text-left font-sans", className)}
    {...props}
  />
)

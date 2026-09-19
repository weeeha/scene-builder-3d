"use client"

import { Button } from "@weeeha/ui/components/button"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@weeeha/ui/components/hover-card"
import { cn } from "@weeeha/ui/lib/utils"
import {
  FileIcon,
  ImageIcon,
  MusicIcon,
  PaperclipIcon,
  VideoIcon,
  XIcon,
} from "./_icons.js"
import type { FileUIPart } from "ai"
import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react"

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

export type AttachmentVariant = "grid" | "inline" | "list"

export type MediaCategory =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "source"
  | "unknown"

/** A source-document part (structurally compatible with the AI SDK's). */
export type AttachmentSource = {
  type: "source-document"
  mediaType?: string
  filename?: string
  title?: string
  url?: string
}

/** Anything renderable as an attachment — a file or a source, with an id. */
export type AttachmentData = (FileUIPart | AttachmentSource) & { id?: string }

const CATEGORY_ICON = {
  image: ImageIcon,
  video: VideoIcon,
  audio: MusicIcon,
  document: FileIcon,
  source: FileIcon,
  unknown: PaperclipIcon,
} as const

const CATEGORY_LABEL: Record<MediaCategory, string> = {
  image: "Image",
  video: "Video",
  audio: "Audio",
  document: "Document",
  source: "Source",
  unknown: "Attachment",
}

function isSource(data: AttachmentData): data is AttachmentSource {
  return (data as { type?: string }).type === "source-document"
}

/** Bucket an attachment into a coarse media category from its mediaType. */
export function getMediaCategory(data: AttachmentData): MediaCategory {
  if (isSource(data)) {
    return "source"
  }

  const mediaType = data.mediaType ?? ""

  if (mediaType.startsWith("image/")) return "image"
  if (mediaType.startsWith("video/")) return "video"
  if (mediaType.startsWith("audio/")) return "audio"
  if (
    mediaType === "application/pdf" ||
    mediaType.startsWith("text/") ||
    mediaType.startsWith("application/")
  ) {
    return "document"
  }

  return "unknown"
}

/** Human label for an attachment — filename, title, or a category fallback. */
export function getAttachmentLabel(data: AttachmentData): string {
  if (data.filename) return data.filename
  if (isSource(data) && data.title) return data.title
  return CATEGORY_LABEL[getMediaCategory(data)]
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type AttachmentsContextValue = { variant: AttachmentVariant }

const AttachmentsContext = createContext<AttachmentsContextValue>({
  variant: "grid",
})

type AttachmentContextValue = {
  data: AttachmentData
  onRemove?: () => void
  variant: AttachmentVariant
}

const AttachmentContext = createContext<AttachmentContextValue | null>(null)

function useAttachment() {
  const context = useContext(AttachmentContext)

  if (!context) {
    throw new Error(
      "Attachment subcomponents must be used within <Attachment>"
    )
  }

  return context
}

// ---------------------------------------------------------------------------
// Attachments — layout container
// ---------------------------------------------------------------------------

export type AttachmentsProps = ComponentProps<"div"> & {
  variant?: AttachmentVariant
}

export function Attachments({
  variant = "grid",
  className,
  children,
  ...props
}: AttachmentsProps) {
  return (
    <AttachmentsContext.Provider value={{ variant }}>
      <div
        data-slot="attachments"
        data-variant={variant}
        className={cn(
          "flex",
          variant === "grid" && "flex-wrap items-start gap-2",
          variant === "inline" && "flex-wrap items-center gap-2",
          variant === "list" && "w-full flex-col gap-1.5",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AttachmentsContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Attachment — single item wrapper
// ---------------------------------------------------------------------------

export type AttachmentProps = ComponentProps<"div"> & {
  data: AttachmentData
  onRemove?: () => void
}

export function Attachment({
  data,
  onRemove,
  className,
  children,
  ...props
}: AttachmentProps) {
  const { variant } = useContext(AttachmentsContext)

  return (
    <AttachmentContext.Provider value={{ data, onRemove, variant }}>
      <div
        data-slot="attachment"
        data-variant={variant}
        className={cn(
          "group/attachment relative",
          variant === "grid" && "size-24 overflow-hidden rounded-lg",
          variant === "inline" &&
            "inline-flex items-center gap-2 rounded-lg border bg-muted/40 py-1 pl-1 pr-2 text-sm",
          variant === "list" &&
            "flex w-full items-center gap-3 rounded-lg border bg-card px-2.5 py-2 text-sm",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </AttachmentContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// AttachmentPreview — image / media thumbnail or icon tile
// ---------------------------------------------------------------------------

export type AttachmentPreviewProps = ComponentProps<"div"> & {
  fallbackIcon?: ReactNode
}

export function AttachmentPreview({
  fallbackIcon,
  className,
  ...props
}: AttachmentPreviewProps) {
  const { data, variant } = useAttachment()
  const category = getMediaCategory(data)
  const label = getAttachmentLabel(data)
  const showImage = category === "image" && Boolean(data.url)
  const CategoryIcon = CATEGORY_ICON[category]

  return (
    <div
      data-slot="attachment-preview"
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-muted text-muted-foreground",
        variant === "grid" && "size-full rounded-lg",
        variant === "list" && "size-9 rounded-md",
        variant === "inline" && "size-7 rounded-md",
        className
      )}
      {...props}
    >
      {showImage ? (
        <img
          alt={label}
          src={data.url}
          className="size-full object-cover"
        />
      ) : (
        (fallbackIcon ?? (
          <CategoryIcon
            className={variant === "grid" ? "size-5" : "size-4"}
          />
        ))
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AttachmentInfo — filename + optional media type
// ---------------------------------------------------------------------------

export type AttachmentInfoProps = ComponentProps<"div"> & {
  showMediaType?: boolean
}

export function AttachmentInfo({
  showMediaType = false,
  className,
  children,
  ...props
}: AttachmentInfoProps) {
  const { data, variant } = useAttachment()
  const label = getAttachmentLabel(data)
  const mediaType = data.mediaType

  return (
    <div
      data-slot="attachment-info"
      className={cn(
        "flex min-w-0 flex-col",
        variant === "inline" && "max-w-[12rem]",
        variant === "list" && "flex-1",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <span className="truncate font-medium text-foreground">{label}</span>
          {showMediaType && mediaType ? (
            <span className="truncate text-xs text-muted-foreground">
              {mediaType}
            </span>
          ) : null}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AttachmentRemove — dismiss button
// ---------------------------------------------------------------------------

export type AttachmentRemoveProps = ComponentProps<typeof Button> & {
  label?: string
}

export function AttachmentRemove({
  label = "Remove",
  className,
  onClick,
  ...props
}: AttachmentRemoveProps) {
  const { onRemove, variant } = useAttachment()

  if (!onRemove) {
    return null
  }

  return (
    <Button
      size="icon-xs"
      type="button"
      variant="ghost"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation()
        onRemove()
        onClick?.(event)
      }}
      className={cn(
        "shrink-0 rounded-full p-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/attachment:opacity-100 [&>svg]:size-3",
        variant === "grid"
          ? "absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background"
          : "hover:bg-accent hover:text-accent-foreground",
        variant === "list" && "ml-auto",
        className
      )}
      {...props}
    >
      <XIcon className="size-3" />
      <span className="sr-only">{label}</span>
    </Button>
  )
}

// ---------------------------------------------------------------------------
// AttachmentHoverCard — optional enlarged preview on hover
// ---------------------------------------------------------------------------

export type AttachmentHoverCardProps = ComponentProps<typeof HoverCard>

export function AttachmentHoverCard({
  openDelay = 200,
  closeDelay = 100,
  ...props
}: AttachmentHoverCardProps) {
  return <HoverCard openDelay={openDelay} closeDelay={closeDelay} {...props} />
}

export type AttachmentHoverCardTriggerProps = ComponentProps<
  typeof HoverCardTrigger
>

export function AttachmentHoverCardTrigger({
  className,
  ...props
}: AttachmentHoverCardTriggerProps) {
  return (
    <HoverCardTrigger
      data-slot="attachment-hover-card-trigger"
      className={cn("cursor-pointer rounded-lg outline-none", className)}
      {...props}
    />
  )
}

export type AttachmentHoverCardContentProps = ComponentProps<
  typeof HoverCardContent
>

export function AttachmentHoverCardContent({
  className,
  align = "center",
  children,
  ...props
}: AttachmentHoverCardContentProps) {
  const { data } = useAttachment()
  const category = getMediaCategory(data)
  const label = getAttachmentLabel(data)
  const CategoryIcon = CATEGORY_ICON[category]

  return (
    <HoverCardContent
      data-slot="attachment-hover-card-content"
      align={align}
      className={cn("w-64 space-y-2 p-2", className)}
      {...props}
    >
      {children ?? (
        <>
          {category === "image" && data.url ? (
            <img
              alt={label}
              src={data.url}
              className="max-h-48 w-full rounded-md object-cover"
            />
          ) : (
            <div className="flex h-24 w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
              <CategoryIcon className="size-6" />
            </div>
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-foreground">
              {label}
            </span>
            {data.mediaType ? (
              <span className="truncate text-xs text-muted-foreground">
                {data.mediaType}
              </span>
            ) : null}
          </div>
        </>
      )}
    </HoverCardContent>
  )
}

// ---------------------------------------------------------------------------
// AttachmentEmpty — empty / dropzone-style state
// ---------------------------------------------------------------------------

export type AttachmentEmptyProps = ComponentProps<"div"> & {
  icon?: ReactNode
}

export function AttachmentEmpty({
  className,
  icon,
  children,
  ...props
}: AttachmentEmptyProps) {
  return (
    <div
      data-slot="attachment-empty"
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-8 text-center",
        className
      )}
      {...props}
    >
      {icon ?? (
        <PaperclipIcon
          className="size-5 text-muted-foreground"
        />
      )}
      <div className="text-sm text-muted-foreground">
        {children ?? "No attachments yet"}
      </div>
    </div>
  )
}

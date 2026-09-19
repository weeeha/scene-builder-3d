"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { LoaderCircle, TriangleAlert, Upload } from "lucide-react"

import { cn } from "@weeeha/ui/lib/utils"

/**
 * Inline per-item drop slot for a checklist row. A page-level hero dropzone is
 * a separate, larger pattern — unifying the two is an open DS decision.
 */
const zone = cva(
  "flex w-full flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] px-4 py-5 text-center transition-colors",
  {
    variants: {
      status: {
        idle: "border-dashed border-status-approved-border bg-status-approved-soft",
        uploading: "border-solid border-border bg-surface-secondary",
        error: "border-dashed border-accent-critical bg-surface-secondary",
      },
    },
    defaultVariants: { status: "idle" },
  }
)

const mainText = cva("inline-flex items-center gap-2 text-sm font-medium leading-5 [&_svg]:size-4", {
  variants: {
    status: {
      idle: "text-status-approved",
      uploading: "text-text-primary",
      error: "text-text-destructive",
    },
  },
})

const MAIN_ICONS = {
  idle: Upload,
  uploading: LoaderCircle,
  error: TriangleAlert,
} as const

/* Device-free verbs per Content → Inclusive writing: a gesture ("drop") is
   named only as one route beside a universal one ("choose"). */
const DEFAULT_MAIN: Record<string, string> = {
  idle: "Drop file here or choose a file",
  uploading: "Uploading…",
  error: "Upload failed — choose a file to retry",
}

interface UploadZoneProps
  extends Omit<React.ComponentProps<"div">, "onDrop">,
    VariantProps<typeof zone> {
  /** Main line; defaults per status. */
  label?: string
  /** Secondary line, e.g. "PDF · up to 25 MB" or the file name while uploading. */
  hint?: string
  /** Called with the dropped/picked files. Renders a hidden file input when set. */
  onFiles?: (files: FileList) => void
  accept?: string
}

function UploadZone({
  className,
  status = "idle",
  label,
  hint,
  onFiles,
  accept,
  ...props
}: UploadZoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const s = status ?? "idle"
  // Error zones stay interactive so a failed upload can be retried in place.
  const interactive = (s === "idle" || s === "error") && !!onFiles
  const MainIcon = MAIN_ICONS[s]

  return (
    <div
      data-slot="upload-zone"
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? () => inputRef.current?.click() : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click()
            }
          : undefined
      }
      onDragOver={interactive ? (e) => e.preventDefault() : undefined}
      onDrop={
        interactive
          ? (e) => {
              e.preventDefault()
              if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files)
            }
          : undefined
      }
      className={cn(zone({ status: s }), interactive && "cursor-pointer", className)}
      {...props}
    >
      {/* Persistent live region: status flips (uploading, error) are silent to
          screen readers otherwise — the spinner icon is aria-hidden. */}
      <span role="status" className="sr-only">
        {s !== "idle" ? (label ?? DEFAULT_MAIN[s]) : null}
      </span>
      <span className={mainText({ status: s })}>
        <MainIcon
          className={s === "uploading" ? "animate-spin" : undefined}
          aria-hidden
        />
        {label ?? DEFAULT_MAIN[s]}
      </span>
      {hint ? <span className="text-xs leading-4 text-text-secondary">{hint}</span> : null}
      {interactive ? (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onFiles(e.target.files)
          }}
        />
      ) : null}
    </div>
  )
}

export { UploadZone }

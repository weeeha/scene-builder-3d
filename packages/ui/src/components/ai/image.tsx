/** biome-ignore-all lint/nursery/useImageSize: "size will be handled by props" */

import { cn } from "@weeeha/ui/lib/utils"
import type { Experimental_GeneratedImage } from "ai"

export type ImageProps = Partial<Experimental_GeneratedImage> & {
  /** Override src directly (e.g. a URL or data URI). When provided, base64/mediaType are ignored. */
  src?: string
  className?: string
  alt?: string
}

export const Image = ({
  base64,
  // pulled out so the binary form never lands on the DOM element below
  uint8Array: _uint8Array,
  mediaType,
  src,
  className,
  alt,
  ...props
}: ImageProps) => {
  const resolvedSrc = src ?? (base64 && mediaType ? `data:${mediaType};base64,${base64}` : undefined)

  if (!resolvedSrc) return null

  return (
    <img
      alt={alt ?? ""}
      src={resolvedSrc}
      className={cn(
        "h-auto max-w-full overflow-hidden rounded-lg border",
        className
      )}
      {...props}
    />
  )
}

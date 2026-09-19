import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@weeeha/ui/lib/utils"

// A transparent, borderless "how-to" explainer: an optional illustration/media
// slot plus an eyebrow / title / body. Drop it straight onto the page or into
// the white question card — the block itself never draws a background or border.
const explainerBlockVariants = cva("flex text-left", {
  variants: {
    layout: {
      stacked: "flex-col gap-3",
      split: "flex-row items-stretch gap-3",
    },
  },
  defaultVariants: { layout: "stacked" },
})

type ExplainerBlockProps = React.ComponentProps<"div"> &
  VariantProps<typeof explainerBlockVariants> & {
    /** Illustration/media source. Omit for a text-only explainer. */
    image?: string
    imageAlt?: string
    eyebrow?: React.ReactNode
    title?: React.ReactNode
    /** Freeform body. For a numbered how-to, pass `steps` instead (or as well). */
    body?: React.ReactNode
    /** Renders a numbered list under the body — the multi-step content mode. */
    steps?: React.ReactNode[]
  }

function ExplainerBlock({
  className,
  layout,
  image,
  imageAlt = "",
  eyebrow,
  title,
  body,
  steps,
  children,
  ...props
}: ExplainerBlockProps) {
  return (
    <div
      data-slot="explainer-block"
      className={cn(explainerBlockVariants({ layout }), className)}
      {...props}
    >
      {image ? (
        <img
          data-slot="explainer-block-media"
          src={image}
          alt={imageAlt}
          loading="lazy"
          className={cn(
            "shrink-0 rounded-lg object-cover",
            layout === "split"
              ? "w-[42%] max-w-[220px] min-h-[140px] self-stretch"
              : "aspect-[16/10] w-full"
          )}
        />
      ) : null}

      <div
        data-slot="explainer-block-content"
        className="flex min-w-0 flex-1 flex-col gap-2"
      >
        {eyebrow ? (
          <p
            data-slot="explainer-block-eyebrow"
            className="text-xs font-medium text-text-accent"
          >
            {eyebrow}
          </p>
        ) : null}

        {title ? (
          <h3
            data-slot="explainer-block-title"
            className="text-lg font-semibold leading-tight text-text-primary"
          >
            {title}
          </h3>
        ) : null}

        {body ? (
          <div
            data-slot="explainer-block-body"
            className="text-base leading-relaxed text-text-secondary"
          >
            {body}
          </div>
        ) : null}

        {steps && steps.length > 0 ? (
          <ol
            data-slot="explainer-block-steps"
            className="flex flex-col gap-2 text-base leading-relaxed text-text-secondary"
          >
            {steps.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span
                  aria-hidden
                  className="font-medium text-text-accent tabular-nums"
                >
                  {i + 1}.
                </span>
                <span className="min-w-0 flex-1">{step}</span>
              </li>
            ))}
          </ol>
        ) : null}

        {children}
      </div>
    </div>
  )
}

export { ExplainerBlock, explainerBlockVariants }
export type { ExplainerBlockProps }

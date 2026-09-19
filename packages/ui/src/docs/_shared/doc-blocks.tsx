import * as React from "react"
import { Unstyled } from "@storybook/addon-docs/blocks"

import { cn } from "@weeeha/ui/lib/utils"

type ExampleProps = React.ComponentProps<"div">

/** Frame for every live example on a docs page.
 *
 *  Exists because MDX-inline JSX bypasses the preview decorator that frames
 *  normal stories — without this wrapper, examples sit on the docs page's own
 *  background and break in dark mode. `Unstyled` opts out of Storybook's docs
 *  typography so kit styles apply cleanly. */
function Example({ className, ...props }: ExampleProps) {
  return (
    <Unstyled>
      <div
        data-slot="doc-example"
        className={cn(
          "bg-background text-foreground border-border my-4 rounded-xl border p-6 font-sans",
          className
        )}
        {...props}
      />
    </Unstyled>
  )
}

type DoDontProps = React.ComponentProps<"div"> & {
  doExample: React.ReactNode
  doCaption: string
  dontExample: React.ReactNode
  dontCaption: string
}

/** Side-by-side Do/Don't pair. Captions are required: a Do/Don't without a
 *  stated reason is decoration, not guidance. */
function DoDont({
  doExample,
  doCaption,
  dontExample,
  dontCaption,
  className,
  ...props
}: DoDontProps) {
  return (
    <Unstyled>
      <div
        data-slot="doc-do-dont"
        className={cn("my-4 grid gap-4 font-sans sm:grid-cols-2", className)}
        {...props}
      >
        <figure className="m-0">
          <div className="bg-background text-foreground border-status-approved-border overflow-x-auto rounded-xl border-2 p-6">
            {doExample}
          </div>
          <figcaption className="text-status-approved mt-2 text-sm">
            <span className="font-semibold">Do</span>{" "}
            <span className="text-text-secondary">— {doCaption}</span>
          </figcaption>
        </figure>
        <figure className="m-0">
          <div className="bg-background text-foreground border-status-action-border overflow-x-auto rounded-xl border-2 p-6">
            {dontExample}
          </div>
          <figcaption className="text-status-action mt-2 text-sm">
            <span className="font-semibold">Don&apos;t</span>{" "}
            <span className="text-text-secondary">— {dontCaption}</span>
          </figcaption>
        </figure>
      </div>
    </Unstyled>
  )
}

export { Example, DoDont }
export type { ExampleProps, DoDontProps }

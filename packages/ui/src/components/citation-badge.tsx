import * as React from "react"

import { cn } from "@weeeha/ui/lib/utils"

type CitationBadgeProps = React.ComponentProps<"a"> & {
  document: string
  section?: string
  url: string
}

function CitationBadge({
  document: doc,
  section,
  url,
  className,
  ...props
}: CitationBadgeProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={doc}
      data-slot="citation-badge"
      className={cn(
        "inline-flex items-center rounded-md border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
      {...props}
    >
      {section ?? "Source"}
    </a>
  )
}

export { CitationBadge }

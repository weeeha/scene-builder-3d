import * as React from "react"

import { cn } from "@weeeha/ui/lib/utils"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@weeeha/ui/components/card"

interface EntityCardProps
  extends Omit<React.ComponentProps<typeof Card>, "title"> {
  /** Image shown at the top of the card. */
  image: string
  imageAlt?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
}

function EntityCard({
  image,
  imageAlt = "",
  title,
  subtitle,
  className,
  ...props
}: EntityCardProps) {
  return (
    <Card data-slot="entity-card" className={cn("gap-3.5", className)} {...props}>
      <img
        src={image}
        alt={imageAlt}
        loading="lazy"
        className="h-40 w-full shrink-0 bg-button-secondary object-cover"
      />
      <CardHeader>
        <CardTitle className="font-semibold">{title}</CardTitle>
        {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
      </CardHeader>
    </Card>
  )
}

export { EntityCard }
export type { EntityCardProps }

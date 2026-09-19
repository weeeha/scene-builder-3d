import * as React from "react"

import { cn } from "@weeeha/ui/lib/utils"
import {
  EntityCard,
  type EntityCardProps,
} from "@weeeha/ui/components/entity-card"

interface EntityCardGridItem
  extends Pick<EntityCardProps, "image" | "imageAlt" | "title" | "subtitle"> {
  /**
   * Stable identity for the React key. Falls back to `href`, then a string
   * `title`, then the array index — provide `id` whenever `title` is a
   * ReactNode or titles can repeat, or reordering will recycle the wrong DOM.
   */
  id?: string
  /** When set (and no `renderItem` override), each card is wrapped in `<a href>`. */
  href?: string
}

interface EntityCardGridProps
  extends Omit<React.ComponentProps<"div">, "children"> {
  /** One entry per tile, in display order. */
  items: readonly EntityCardGridItem[]
  /**
   * Wrap each rendered card — e.g. to use a framework router link for
   * client-side navigation / prefetch. Receives the card element and its item.
   * Defaults to a plain `<a href>` when the item has an `href`.
   */
  renderItem?: (
    card: React.ReactElement,
    item: EntityCardGridItem,
    index: number
  ) => React.ReactNode
}

/**
 * Responsive card grid — 2 columns on small screens, 4 on large.
 * Each tile is a {@link EntityCard} with a subtle hover lift; the image height
 * steps up (h-32 → h-40) with the breakpoint to keep the grid balanced.
 */
function EntityCardGrid({
  items,
  renderItem,
  className,
  ...props
}: EntityCardGridProps) {
  return (
    <div
      data-slot="entity-card-grid"
      className={cn(
        "grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6",
        className
      )}
      {...props}
    >
      {items.map((item, index) => {
        const card = (
          <EntityCard
            image={item.image}
            imageAlt={item.imageAlt}
            title={item.title}
            subtitle={item.subtitle}
            className="h-full transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:ring-foreground/20 [&_img]:h-32 lg:[&_img]:h-40"
          />
        )

        const key =
          item.id ??
          item.href ??
          (typeof item.title === "string" ? item.title : index)

        const content = renderItem
          ? renderItem(card, item, index)
          : item.href
            ? (
              <a href={item.href} className="block h-full">
                {card}
              </a>
            )
            : card

        return <React.Fragment key={key}>{content}</React.Fragment>
      })}
    </div>
  )
}

export { EntityCardGrid }
export type { EntityCardGridProps, EntityCardGridItem }

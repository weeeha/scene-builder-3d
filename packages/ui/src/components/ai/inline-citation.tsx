"use client"

import { Badge } from "@weeeha/ui/components/badge"
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@weeeha/ui/components/carousel"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@weeeha/ui/components/hover-card"
import { cn } from "@weeeha/ui/lib/utils"
import { ChevronLeftIcon, ChevronRightIcon } from "./_icons.js"

const safeHostname = (url: string) => {
  try { return new URL(url).hostname } catch { return url }
}
import {
  type ComponentProps,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react"

export type InlineCitationProps = ComponentProps<"span">

export const InlineCitation = ({
  className,
  ...props
}: InlineCitationProps) => (
  <span
    data-slot="inline-citation"
    className={cn("group inline items-center gap-1", className)}
    {...props}
  />
)

export type InlineCitationTextProps = ComponentProps<"span">

export const InlineCitationText = ({
  className,
  ...props
}: InlineCitationTextProps) => (
  <span
    data-slot="inline-citation-text"
    className={cn("transition-colors group-hover:bg-muted", className)}
    {...props}
  />
)

export type InlineCitationCardProps = ComponentProps<typeof HoverCard>

export const InlineCitationCard = (props: InlineCitationCardProps) => (
  <HoverCard closeDelay={0} openDelay={0} {...props} />
)

export type InlineCitationCardTriggerProps = ComponentProps<typeof Badge> & {
  sources: string[]
}

export const InlineCitationCardTrigger = ({
  sources,
  className,
  ...props
}: InlineCitationCardTriggerProps) => (
  <HoverCardTrigger asChild>
    <Badge
      data-slot="inline-citation-card-trigger"
      className={cn("ml-1 cursor-pointer rounded-full", className)}
      variant="secondary"
      {...props}
      asChild
    >
      {/* real button so the card is reachable by keyboard focus, not just hover */}
      <button type="button">
        {sources[0] ? (
          <>
            {safeHostname(sources[0])}{" "}
            {sources.length > 1 && `+${sources.length - 1}`}
          </>
        ) : (
          "unknown"
        )}
      </button>
    </Badge>
  </HoverCardTrigger>
)

export type InlineCitationCardBodyProps = ComponentProps<"div">

export const InlineCitationCardBody = ({
  className,
  ...props
}: InlineCitationCardBodyProps) => (
  <HoverCardContent
    data-slot="inline-citation-card-body"
    className={cn("relative w-80 p-0", className)}
    {...props}
  />
)

const CarouselApiContext = createContext<CarouselApi | undefined>(undefined)

const useCarouselApi = () => {
  const context = useContext(CarouselApiContext)
  return context
}

export type InlineCitationCarouselProps = ComponentProps<typeof Carousel>

export const InlineCitationCarousel = ({
  className,
  children,
  ...props
}: InlineCitationCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>()

  return (
    <CarouselApiContext.Provider value={api}>
      <Carousel
        data-slot="inline-citation-carousel"
        className={cn("w-full", className)}
        setApi={setApi}
        {...props}
      >
        {children}
      </Carousel>
    </CarouselApiContext.Provider>
  )
}

export type InlineCitationCarouselContentProps = ComponentProps<"div">

export const InlineCitationCarouselContent = (
  props: InlineCitationCarouselContentProps
) => <CarouselContent {...props} />

export type InlineCitationCarouselItemProps = ComponentProps<"div">

export const InlineCitationCarouselItem = ({
  className,
  ...props
}: InlineCitationCarouselItemProps) => (
  <CarouselItem
    data-slot="inline-citation-carousel-item"
    className={cn("w-full space-y-2 p-4 pl-8", className)}
    {...props}
  />
)

export type InlineCitationCarouselHeaderProps = ComponentProps<"div">

export const InlineCitationCarouselHeader = ({
  className,
  ...props
}: InlineCitationCarouselHeaderProps) => (
  <div
    data-slot="inline-citation-carousel-header"
    className={cn(
      "flex items-center justify-between gap-2 rounded-t-md bg-muted p-2",
      className
    )}
    {...props}
  />
)

export type InlineCitationCarouselIndexProps = ComponentProps<"div">

export const InlineCitationCarouselIndex = ({
  children,
  className,
  ...props
}: InlineCitationCarouselIndexProps) => {
  const api = useCarouselApi()

  // Derive from the carousel during render rather than mirroring into state from
  // an effect. The previous version also registered a "select" listener it never
  // removed, so every remount leaked one.
  const [, bumpVersion] = useReducer((n: number) => n + 1, 0)
  const count = api?.scrollSnapList().length ?? 0
  const current = api ? api.selectedScrollSnap() + 1 : 0

  useEffect(() => {
    if (!api) {
      return
    }
    api.on("select", bumpVersion).on("reInit", bumpVersion)
    return () => {
      api.off("select", bumpVersion).off("reInit", bumpVersion)
    }
  }, [api, bumpVersion])

  return (
    <div
      data-slot="inline-citation-carousel-index"
      className={cn(
        "flex flex-1 items-center justify-end px-3 py-1 font-sans text-muted-foreground text-xs",
        className
      )}
      {...props}
    >
      {children ?? `${current}/${count}`}
    </div>
  )
}

export type InlineCitationCarouselPrevProps = ComponentProps<"button">

export const InlineCitationCarouselPrev = ({
  className,
  ...props
}: InlineCitationCarouselPrevProps) => {
  const api = useCarouselApi()

  const handleClick = useCallback(() => {
    if (api) {
      api.scrollPrev()
    }
  }, [api])

  return (
    <button
      aria-label="Previous slide"
      data-slot="inline-citation-carousel-prev"
      className={cn(
        "shrink-0 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      onClick={handleClick}
      type="button"
      {...props}
    >
      <ChevronLeftIcon className="size-4 text-muted-foreground" />
    </button>
  )
}

export type InlineCitationCarouselNextProps = ComponentProps<"button">

export const InlineCitationCarouselNext = ({
  className,
  ...props
}: InlineCitationCarouselNextProps) => {
  const api = useCarouselApi()

  const handleClick = useCallback(() => {
    if (api) {
      api.scrollNext()
    }
  }, [api])

  return (
    <button
      aria-label="Next slide"
      data-slot="inline-citation-carousel-next"
      className={cn(
        "shrink-0 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      )}
      onClick={handleClick}
      type="button"
      {...props}
    >
      <ChevronRightIcon className="size-4 text-muted-foreground" />
    </button>
  )
}

export type InlineCitationSourceProps = ComponentProps<"div"> & {
  title?: string
  url?: string
  description?: string
}

export const InlineCitationSource = ({
  title,
  url,
  description,
  className,
  children,
  ...props
}: InlineCitationSourceProps) => (
  <div
    data-slot="inline-citation-source"
    className={cn("space-y-1", className)}
    {...props}
  >
    {title && (
      <h4 className="truncate font-medium text-sm leading-tight">{title}</h4>
    )}
    {url && (
      <p className="truncate break-all text-muted-foreground text-xs">{url}</p>
    )}
    {description && (
      <p className="line-clamp-3 text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    )}
    {children}
  </div>
)

export type InlineCitationQuoteProps = ComponentProps<"blockquote">

export const InlineCitationQuote = ({
  children,
  className,
  ...props
}: InlineCitationQuoteProps) => (
  <blockquote
    data-slot="inline-citation-quote"
    className={cn(
      "border-border border-l-2 pl-3 text-muted-foreground text-sm italic",
      className
    )}
    {...props}
  >
    {children}
  </blockquote>
)

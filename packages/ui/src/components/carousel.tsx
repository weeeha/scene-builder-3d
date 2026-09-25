"use client"

import * as React from "react"
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react"

import { cn } from "@weeeha/ui/lib/utils"
import { Button } from "@weeeha/ui/components/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

type CarouselApi = UseEmblaCarouselType[1]
type CarouselProps = {
  opts?: Parameters<typeof useEmblaCarousel>[0]
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}
type CarouselContextProps = CarouselProps & {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: CarouselApi
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
}

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const ctx = React.useContext(CarouselContext)
  if (!ctx) throw new Error("useCarousel must be used within a <Carousel />")
  return ctx
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & CarouselProps) {
  const [carouselRef, api] = useEmblaCarousel({ ...opts, axis: orientation === "horizontal" ? "x" : "y" })

  // Embla owns the scroll position, so derive the affordances from it during
  // render and use a version bump purely to re-render on its events. Mirroring
  // them into state meant setting state synchronously inside the effect body,
  // which renders once with stale `false` values on mount.
  const [, bumpVersion] = React.useReducer((n: number) => n + 1, 0)
  const canScrollPrev = api?.canScrollPrev() ?? false
  const canScrollNext = api?.canScrollNext() ?? false

  const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api])
  const scrollNext = React.useCallback(() => api?.scrollNext(), [api])

  // Captured on the region so the arrows work from anywhere inside it (the
  // buttons are the usual focus holders). Keys follow the axis: a vertical
  // carousel answering to ArrowLeft would contradict what the eye sees.
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const [prevKey, nextKey] = orientation === "horizontal" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"]
      if (event.key === prevKey) {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === nextKey) {
        event.preventDefault()
        scrollNext()
      }
    },
    [orientation, scrollPrev, scrollNext]
  )

  React.useEffect(() => { if (api && setApi) setApi(api) }, [api, setApi])
  React.useEffect(() => {
    if (!api) return
    api.on("reInit", bumpVersion).on("select", bumpVersion)
    // the previous cleanup detached "select" but leaked the "reInit" listener
    return () => { api.off("reInit", bumpVersion).off("select", bumpVersion) }
  }, [api, bumpVersion])

  return (
    <CarouselContext.Provider value={{ carouselRef, api, opts, orientation, scrollPrev, scrollNext, canScrollPrev, canScrollNext }}>
      {/* aria-label sits before the spread: a nameless region is skipped by
          landmark navigation, so a generic default beats none — replace it
          with a content-specific one via props. */}
      <div data-slot="carousel" className={cn("relative", className)} role="region" aria-roledescription="carousel" aria-label="carousel" onKeyDownCapture={handleKeyDown} {...props}>
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { carouselRef, orientation } = useCarousel()
  return (
    <div ref={carouselRef} data-slot="carousel-content" className="overflow-hidden">
      <div className={cn("flex", orientation === "horizontal" ? "-ms-4" : "-mt-4 flex-col", className)} {...props} />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  const { orientation } = useCarousel()
  return (
    <div
      data-slot="carousel-item"
      role="group"
      aria-roledescription="slide"
      className={cn("min-w-0 shrink-0 grow-0 basis-full", orientation === "horizontal" ? "ps-4" : "pt-4", className)}
      {...props}
    />
  )
}

// Diverges from upstream shadcn: horizontal arrows center via top-[calc(50%-0.875rem)]
// (half the size-7 button), not top-1/2 -translate-y-1/2. The Button's built-in
// active:translate-y-px press effect overwrites --tw-translate-y, which teleported
// the arrow ~15px on mousedown so mouseup landed outside it and swallowed the click.
function CarouselPrevious({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()
  return (
    <Button
      data-slot="carousel-previous"
      variant="outline"
      size="icon"
      className={cn("absolute size-7 rounded-full", orientation === "horizontal" ? "top-[calc(50%-0.875rem)] -start-3" : "-top-3 start-1/2 -translate-x-1/2 rotate-90", className)}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ChevronLeft />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
}

function CarouselNext({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()
  return (
    <Button
      data-slot="carousel-next"
      variant="outline"
      size="icon"
      className={cn("absolute size-7 rounded-full", orientation === "horizontal" ? "top-[calc(50%-0.875rem)] -end-3" : "-bottom-3 start-1/2 -translate-x-1/2 rotate-90", className)}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ChevronRight />
      <span className="sr-only">Next slide</span>
    </Button>
  )
}

export { type CarouselApi, Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext }

"use client"

import * as React from "react"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"
import { cva, type VariantProps } from "class-variance-authority"
import { Check } from "lucide-react"

import { cn } from "@weeeha/ui/lib/utils"

/** Lets ChoiceCard know whether it sits in a single- or multi-select group,
 *  so the checkbox indicator can default per the DS rule: checkboxes read as
 *  multi-select, single-select is border-only (Figma 546:18098 / 673:35877). */
const ChoiceCardGroupContext = React.createContext<"single" | "multiple">(
  "single"
)

function ChoiceCardGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ChoiceCardGroupContext.Provider value={props.type}>
      <ToggleGroupPrimitive.Root
        data-slot="choice-card-group"
        className={cn("flex flex-col gap-3", className)}
        {...props}
      />
    </ChoiceCardGroupContext.Provider>
  )
}

const choiceCardVariants = cva(
  "group/choice-card relative flex items-start gap-3 rounded-lg border bg-surface-card text-left text-text-primary outline-none transition-colors select-none hover:bg-surface-secondary/40 focus-visible:border-border-focus-ring focus-visible:ring-3 focus-visible:ring-border-focus-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:border-[var(--qf-selected,var(--primary))] data-[state=on]:bg-[var(--qf-selected,var(--primary))]/5",
  {
    variants: {
      size: {
        card: "w-full px-4 py-3.5",
        chip: "w-fit items-center px-3 py-1.5 text-sm",
      },
      centered: {
        true: "items-center justify-center text-center data-[state=on]:font-semibold data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-[var(--qf-selected,var(--primary))]",
        false: "",
      },
    },
    defaultVariants: { size: "card", centered: false },
  }
)

type ChoiceCardGroupProps = React.ComponentProps<
  typeof ToggleGroupPrimitive.Root
>

type ChoiceCardProps = React.ComponentProps<typeof ToggleGroupPrimitive.Item> &
  VariantProps<typeof choiceCardVariants> & {
    /** Show the checkbox indicator. Defaults by group type: true in
     *  `type="multiple"` groups, false in `type="single"` (border-only). */
    indicator?: boolean
  }

/**
 * ChoiceCardMedia detection that survives `React.memo` / `React.forwardRef`
 * wrappers (they replace the element `type` with a wrapper object exposing the
 * inner component as `.type` / `.render`). A custom component that merely
 * renders a ChoiceCardMedia still can't be detected — pass ChoiceCardMedia
 * itself (possibly wrapped) as a direct child.
 */
function isChoiceCardMedia(child: React.ReactNode): boolean {
  if (!React.isValidElement(child)) return false
  let type: unknown = child.type
  while (type && typeof type === "object") {
    const wrapper = type as { type?: unknown; render?: unknown }
    type = wrapper.type ?? wrapper.render
  }
  return type === ChoiceCardMedia
}

function ChoiceCard({
  className,
  size = "card",
  centered,
  indicator,
  children,
  ...props
}: ChoiceCardProps) {
  const groupType = React.useContext(ChoiceCardGroupContext)
  const showIndicator =
    (indicator ?? groupType === "multiple") && size !== "chip" && !centered
  const childArray = React.Children.toArray(children)
  const media = childArray.filter(isChoiceCardMedia)
  const content = childArray.filter((c) => !isChoiceCardMedia(c))
  return (
    <ToggleGroupPrimitive.Item
      data-slot="choice-card"
      className={cn(choiceCardVariants({ size, centered }), className)}
      {...props}
    >
      {showIndicator && (
        <span
          data-slot="choice-card-indicator"
          className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-input transition-colors group-data-[state=on]/choice-card:border-[var(--qf-selected,var(--primary))] group-data-[state=on]/choice-card:bg-[var(--qf-selected,var(--primary))] group-data-[state=on]/choice-card:text-primary-foreground"
        >
          <Check
            strokeWidth={2.5}
            className="size-3 opacity-0 transition-opacity group-data-[state=on]/choice-card:opacity-100"
          />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">{content}</span>
      {media}
    </ToggleGroupPrimitive.Item>
  )
}

function ChoiceCardTitle({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="choice-card-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  )
}

function ChoiceCardDescription({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="choice-card-description"
      className={cn("text-text-secondary text-sm", className)}
      {...props}
    />
  )
}

function ChoiceCardMedia({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="choice-card-media"
      className={cn(
        "ml-auto flex size-10 shrink-0 items-center justify-center self-center text-text-secondary [&_svg]:size-6",
        className
      )}
      {...props}
    />
  )
}

export {
  ChoiceCardGroup,
  ChoiceCard,
  ChoiceCardTitle,
  ChoiceCardDescription,
  ChoiceCardMedia,
}
export type { ChoiceCardGroupProps, ChoiceCardProps }

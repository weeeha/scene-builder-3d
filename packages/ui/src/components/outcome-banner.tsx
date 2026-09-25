import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { CircleCheck, File, TriangleAlert } from "lucide-react"

import { cn } from "@weeeha/ui/lib/utils"

const iconWrap = cva(
  "flex size-[70px] items-center justify-center rounded-full [&_svg]:size-8",
  {
    variants: {
      tone: {
        positive: "bg-button-primary/10 text-text-accent",
        info: "bg-accent-info/10 text-accent-info",
        warning: "bg-required/10 text-required",
      },
    },
    defaultVariants: { tone: "positive" },
  }
)

const verdict = cva("text-xl font-semibold", {
  variants: {
    tone: {
      positive: "text-text-accent",
      info: "text-accent-info",
      warning: "text-required",
    },
  },
  defaultVariants: { tone: "positive" },
})

const ICONS = {
  positive: CircleCheck,
  info: File,
  warning: TriangleAlert,
} as const

interface OutcomeBannerProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof iconWrap> {
  eyebrow?: string
}

function OutcomeBanner({
  className,
  tone = "positive",
  eyebrow = "Based on your answers",
  children,
  ...props
}: OutcomeBannerProps) {
  const Icon = ICONS[tone ?? "positive"]
  return (
    <div
      data-slot="outcome-banner"
      className={cn("flex flex-col items-center gap-3 py-6 text-center", className)}
      {...props}
    >
      <span className={iconWrap({ tone })}>
        <Icon />
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-text-secondary">{eyebrow}</span>
        <span className={verdict({ tone })}>{children}</span>
      </div>
    </div>
  )
}

export { OutcomeBanner }
export type { OutcomeBannerProps }

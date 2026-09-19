import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { BookOpen, type LucideIcon } from "lucide-react"

import { cn } from "@weeeha/ui/lib/utils"

const iconWrap = cva("shrink-0 [&_svg]:size-10", {
  variants: {
    tone: {
      neutral: "text-text-primary",
      info: "text-accent-info",
      warning: "text-required",
    },
  },
  defaultVariants: { tone: "neutral" },
})

interface GuidanceCardProps
  extends Omit<React.ComponentProps<"div">, "title">,
    VariantProps<typeof iconWrap> {
  title: string
  icon?: LucideIcon
}

function GuidanceCard({
  className,
  title,
  tone = "neutral",
  icon: Icon = BookOpen,
  children,
  ...props
}: GuidanceCardProps) {
  return (
    <div
      data-slot="guidance-card"
      data-tone={tone}
      role="note"
      className={cn("rounded-2xl bg-surface-secondary p-6", className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <span className={iconWrap({ tone })}>
          <Icon />
        </span>
        <h3 className="text-lg font-medium leading-tight text-text-primary">{title}</h3>
      </div>
      <div className="mt-2 flex flex-col gap-2 text-base leading-normal text-text-primary [&_strong]:font-semibold">
        {children}
      </div>
    </div>
  )
}

export { GuidanceCard }
export type { GuidanceCardProps }

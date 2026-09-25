import { cn } from "@weeeha/ui/lib/utils"
import { LoaderCircle } from "lucide-react"

type SpinnerProps = Omit<React.ComponentProps<"svg">, "strokeWidth">

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <LoaderCircle data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
export type { SpinnerProps }

import * as React from "react";

import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        // text-foreground, not text-muted-foreground: bg-muted +
        // text-muted-foreground is 4.34:1, under 4.5:1 (see
        // docs/design-system/a11y-baseline.md). text-foreground keeps the
        // muted key-cap fill and clears contrast against it.
        "bg-muted text-foreground pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded border px-1.5 font-mono text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}

function KbdGroup({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span data-slot="kbd-group" className={cn("inline-flex items-center gap-1", className)} {...props} />
  );
}

export { Kbd, KbdGroup };

"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ResetAffordanceState = "modified" | "default" | "keyframed";

interface ResetAffordanceProps extends Omit<React.ComponentProps<"button">, "onReset"> {
  state?: ResetAffordanceState;
  /** "group" sits on a section header and clears every row beneath it. */
  scope?: "row" | "group";
  /** On a collapsed group this degrades to a dot, so hidden changes still signal. */
  collapsed?: boolean;
  onReset?: () => void;
  label?: string;
}

function ResetAffordance({
  state = "default",
  scope = "row",
  collapsed = false,
  onReset,
  label = "Reset",
  className,
  ...props
}: ResetAffordanceProps) {
  if (collapsed) {
    return (
      <span
        data-slot="reset-affordance-dot"
        data-state={state}
        aria-hidden="true"
        className={cn(
          "inline-block size-1.5 rounded-full",
          state === "default" ? "bg-transparent" : "bg-foreground",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onReset}
      // Nothing to reset at default — kept mounted, and dimmed, so the control
      // never changes position between states.
      disabled={state === "default"}
      aria-label={label}
      data-slot="reset-affordance"
      data-state={state}
      className={cn(
        "text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex shrink-0 items-center justify-center rounded transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-30",
        scope === "group" ? "size-6 text-sm" : "size-5 text-xs",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">{state === "keyframed" ? "◇" : "↺"}</span>
    </button>
  );
}

export { ResetAffordance };
export type { ResetAffordanceProps, ResetAffordanceState };

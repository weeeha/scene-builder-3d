"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface ChoiceChipsContextValue {
  value?: string;
  setValue: (value: string) => void;
}
const ChoiceChipsContext = React.createContext<ChoiceChipsContextValue | null>(null);

interface ChoiceChipsProps extends Omit<React.ComponentProps<"div">, "defaultValue"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

function ChoiceChips({
  value: valueProp,
  defaultValue,
  onValueChange,
  className,
  ...props
}: ChoiceChipsProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const value = valueProp ?? internal;
  const setValue = React.useCallback(
    (next: string) => {
      setInternal(next);
      onValueChange?.(next);
    },
    [onValueChange],
  );
  return (
    <ChoiceChipsContext.Provider value={{ value, setValue }}>
      <div
        role="radiogroup"
        data-slot="choice-chips"
        className={cn("flex flex-wrap gap-2", className)}
        {...props}
      />
    </ChoiceChipsContext.Provider>
  );
}

interface ChoiceChipProps extends React.ComponentProps<"button"> {
  value: string;
}

function ChoiceChip({ value, className, onClick, ...props }: ChoiceChipProps) {
  const ctx = React.useContext(ChoiceChipsContext);
  if (!ctx) throw new Error("ChoiceChip must be used within ChoiceChips");
  const selected = ctx.value === value;
  // TODO: roving tabIndex per ARIA radiogroup pattern (v1 ships Tab-per-chip)
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected ? "true" : "false"}
      data-slot="choice-chip"
      data-state={selected ? "on" : "off"}
      onClick={(e) => {
        ctx.setValue(value);
        onClick?.(e);
      }}
      className={cn(
        // `motion-reduce:transition-none` is the same one-class branch the registry
        // already uses beside `transition-*` and `animate-*` (pricing-table,
        // trace-timeline, task-tray, citation-ref). Without it the hover/selection
        // colour fade has no reduced-motion path at all.
        "hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none rounded-lg border px-3 py-1.5 text-sm transition-colors motion-reduce:transition-none",
        selected && "ring-ring border-ring ring-2",
        className,
      )}
      {...props}
    />
  );
}

export { ChoiceChip, ChoiceChips };

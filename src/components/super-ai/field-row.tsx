"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface FieldRowProps extends Omit<React.ComponentProps<"div">, "children"> {
  label: string;
  hint?: string;
  /**
   * Optional trailing slot, normally a `reset-affordance` (A11). It is what makes
   * a row feel bound to a value. Omitting it renders exactly what shipped before.
   */
  reset?: React.ReactNode;
  children: (controlId: string, describedBy?: string) => React.ReactNode;
}

function FieldRow({ label, hint, reset, className, children, ...props }: FieldRowProps) {
  const id = React.useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div data-slot="field-row" className={cn("space-y-1", className)} {...props}>
      <div className="grid grid-cols-[6rem_1fr] items-center gap-3">
        <label htmlFor={id} data-slot="field-row-label" className="text-muted-foreground text-sm">
          {label}
        </label>
        <div data-slot="field-row-control" className="flex items-center gap-2">
          {children(id, hintId)}
          {reset ? <span data-slot="field-row-reset">{reset}</span> : null}
        </div>
      </div>
      {hint ? (
        <p id={hintId} data-slot="field-row-hint" className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface UnitInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  unit: string;
  onValueChange?: (value: number) => void;
}

function UnitInput({ unit, onValueChange, onChange, className, ...props }: UnitInputProps) {
  return (
    <span
      data-slot="unit-input"
      className={cn(
        "border-input focus-within:ring-ring inline-flex h-8 w-20 items-center rounded-md border bg-transparent focus-within:ring-2",
        className,
      )}
    >
      <input
        type="number"
        inputMode="decimal"
        // Logical, not physical: the value has to sit against the unit
        // suffix, and under `dir="rtl"` the suffix moves to the visual left.
        // `text-end` is `text-right` in LTR and mirrors correctly in RTL.
        className="w-full min-w-0 bg-transparent px-2 py-1 text-end text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          if (!Number.isNaN(n)) onValueChange?.(n);
          onChange?.(e);
        }}
        {...props}
      />
      {/* TODO: click-to-focus the input from the unit suffix */}
      {/* `pe-2`, not `pr-2`: in RTL the suffix sits at the visual left and the
          padding has to follow it, or the unit ends up flush to the border. */}
      <span data-slot="unit-input-unit" className="text-muted-foreground pe-2 text-xs">
        {unit}
      </span>
    </span>
  );
}

export { FieldRow, UnitInput };

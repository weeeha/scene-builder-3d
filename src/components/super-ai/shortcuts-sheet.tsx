"use client";

import * as React from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@weeeha/ui/components/dialog";
import { cn } from "@/lib/utils";

import { Kbd, KbdGroup } from "./kbd";

interface Shortcut {
  label: string;
  keys: string[];
}
interface ShortcutSection {
  title: string;
  shortcuts: Shortcut[];
}

interface ShortcutsSheetProps {
  sections: ShortcutSection[];
  title?: string;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

// @weeeha/ui's Dialog is a Radix wrapper, so its DialogTrigger takes
// `asChild`, not the Base UI `render` prop this component was originally
// written against. asChild merges the open-toggle handler onto the
// user-supplied trigger element the same way render did upstream.

function ShortcutsSheet({
  sections,
  title = "Keyboard Shortcuts",
  trigger,
  open,
  onOpenChange,
  className,
}: ShortcutsSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        data-slot="shortcuts-sheet"
        className={cn(
          // Reduced motion, with the variant repeated on purpose. The
          // registry's usual bare `motion-reduce:animate-none` is inert against
          // a Base UI popup: DialogContent animates through
          // `data-open:animate-in` / `data-closed:animate-out`, which Tailwind
          // v4 compiles to `.data-open\:animate-in:where([data-open]…)`. The
          // `:where()` contributes no specificity, so both rules are a single
          // class and the tie is broken by source order — and the plain
          // `motion-reduce:` block is emitted well before the `data-*`
          // variants, so `animation: enter` wins. Restating the data variant
          // sorts this override after its counterpart, which wins the same tie.
          // Verified by reading `animation-name` back — see the ReducedMotion
          // story. The backdrop still fades; that class is in ui/dialog.tsx.
          "flex max-h-[80vh] flex-col motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none sm:max-w-md",
          className,
        )}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* The list scrolls once the sections pass the 80vh cap, so it carries
            its own tab stop and name — axe `scrollable-region-focusable`.
            Without it the only keyboard-reachable thing in a sixty-binding
            sheet is its close button.

            A `<section>`, not a `<div>`: the shell components this borrows
            from name *sectioning* elements (library-shell's `<aside
            aria-label="Filters">` and `<section aria-label="Assets">`,
            artifact-shell's and docs-shell's named `<section>`s), and that is
            load-bearing rather than incidental. A bare `<div>` has role
            `generic`, on which ARIA prohibits `aria-label`; the attribute is
            simply not exposed, so the tab stop would arrive unnamed. Named,
            this is a `region` landmark.

            The name is the list's contents, not the sheet's title. `title`
            defaults to "Keyboard Shortcuts", which is already the dialog's own
            accessible name — reusing it would make the region announce its
            container a second time. Same rule the shells follow: "Assets",
            "Filters", and here the bindings themselves. */}
        <section
          data-slot="shortcuts-list"
          tabIndex={0}
          aria-label="Shortcut list"
          className="focus-visible:ring-ring flex-1 space-y-5 overflow-y-auto focus-visible:ring-2 focus-visible:outline-none"
        >
          {sections.map((section) => (
            <section key={section.title} data-slot="shortcuts-section" className="space-y-1">
              <h3 className="text-sm font-semibold">{section.title}</h3>
              <ul>
                {section.shortcuts.map((shortcut) => (
                  <li
                    key={shortcut.label}
                    data-slot="shortcuts-row"
                    className="flex items-center justify-between border-b py-2 text-sm last:border-0"
                  >
                    <span>{shortcut.label}</span>
                    <KbdGroup>
                      {shortcut.keys.map((key, i) => (
                        <Kbd key={`${i}-${key}`}>{key}</Kbd>
                      ))}
                    </KbdGroup>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </section>
      </DialogContent>
    </Dialog>
  );
}

export { ShortcutsSheet };
export type { Shortcut, ShortcutSection };

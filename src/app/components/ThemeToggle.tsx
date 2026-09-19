import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@weeeha/ui/components/button";

// @weeeha/ui/components/mode-toggle is a Viewer/Designer content switch
// (see its own ModeToggleProps), not a light and dark control. next-themes
// is already a dependency of the kit through theme-provider, so this reads
// and flips the resolved theme directly. The kit's ThemeProvider also binds
// the "d" key (outside a text field) to the same toggle.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
  );
}

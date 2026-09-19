import { Button } from "@weeeha/ui/components/button";
import { ThemeProvider } from "@weeeha/ui/components/theme-provider";

import { ThemeToggle } from "@/app/components/ThemeToggle";
import { Kbd } from "@/components/super-ai/kbd";

function App() {
  return (
    <ThemeProvider>
      <div className="flex flex-col items-start gap-4 p-8">
        <p>scene-builder-3d</p>
        <Button>Placeholder button</Button>
        <Kbd>D</Kbd>
        <ThemeToggle />
      </div>
    </ThemeProvider>
  );
}

export default App;

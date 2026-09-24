import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    css: false,
    // Playwright specs live under e2e/ and match Vitest's default
    // "*.spec.ts" glob. Exclude that directory so `npm run test` does not
    // try to run Playwright's test() outside the Playwright runner.
    // .claude/** holds a git worktree from another session; its own test
    // files match Vitest's default glob too, so exclude it or a bare
    // `npm test` fails on files that have nothing to do with this repo.
    // spikes/** are throwaway projects with their own package.json and
    // dependencies (the VR spike needs @react-three/xr, which the app does
    // not install), so they run their own tests, never this one's.
    exclude: [...configDefaults.exclude, "e2e/**", ".claude/**", "spikes/**"],
  },
});

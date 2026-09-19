import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}", "src/storage/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react/*", "react-dom", "react-dom/*"],
              message:
                "src/domain and src/storage must stay framework-free. See AGENTS.md, Global Constraints.",
            },
            {
              group: ["three", "three/*"],
              message:
                "src/domain and src/storage must stay framework-free. See AGENTS.md, Global Constraints.",
            },
            {
              group: ["@react-three/*"],
              message:
                "src/domain and src/storage must stay framework-free. See AGENTS.md, Global Constraints.",
            },
          ],
        },
      ],
    },
  },
]);

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { fileURLToPath } from "node:url";
import { takesPlugin } from "./takes-plugin";

const useHttps = process.env.SPIKE_HTTP !== "1";

export default defineConfig({
  plugins: [react(), ...(useHttps ? [basicSsl()] : []), takesPlugin()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { host: true, port: 5173, strictPort: true },
  test: { environment: "node", include: ["src/**/*.test.ts", "takes-plugin.test.ts"] },
});

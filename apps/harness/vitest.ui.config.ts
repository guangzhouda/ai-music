import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    name: "ui",
    globals: true,
    environment: "jsdom",
    include: ["src/ui/**/*.test.tsx"],
    setupFiles: ["./src/ui/setup.ts"],
    testTimeout: 10_000,
    env: {
      VITE_API_BASE_URL: "http://localhost:8787"
    },
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify("http://localhost:8787")
    },
    css: false
  }
});

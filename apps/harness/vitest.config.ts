import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "harness",
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    // File-level teardown: ensures in-memory mocks don't leak across files
    clearMocks: true,
    restoreMocks: true,
    // Timeout for async operations (provider fakes, service flows)
    testTimeout: 15_000,
    setupFiles: ["./vitest.setup.ts"],
    // Coverage settings
    coverage: {
      provider: "v8",
      include: ["../../apps/server/src/**/*.ts"],
      exclude: ["../../apps/server/src/index.ts"],
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage"
    }
  }
});

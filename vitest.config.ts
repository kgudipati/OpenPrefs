import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      enabled: true,
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      provider: "v8",
      reporter: ["text", "lcov"],
      thresholds: {
        branches: 85,
        lines: 90,
      },
    },
  },
});

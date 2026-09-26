import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["evaluation/quality/**/*.test.ts"],
    environment: "node",
    dangerouslyIgnoreUnhandledErrors: false,
  },
});

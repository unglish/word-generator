import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["evaluation/review/**/*.test.ts"],
    exclude: ["evaluation/review/**/*.db.test.ts"],
    environment: "node",
    dangerouslyIgnoreUnhandledErrors: false,
  },
});

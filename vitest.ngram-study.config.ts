import { defineConfig } from "vitest/config";

export default defineConfig({ test: {
  include: ["evaluation/quality/probes/ngram-gates/*.test.ts"],
  fileParallelism: false,
  pool: "threads",
  testTimeout: 60000,
} });

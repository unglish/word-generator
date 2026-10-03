import { defineConfig } from "vitest/config";
export default defineConfig({ test: {
  include: [".local-evidence/lexical-style/implementation/style-kernel.test.ts"],
  environment: "node", fileParallelism: false, testTimeout: 10000,
  dangerouslyIgnoreUnhandledErrors: false,
} });

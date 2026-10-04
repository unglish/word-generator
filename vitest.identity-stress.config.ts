import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/phonology/identity-stress-score.test.ts", "evaluation/experiments/identity-stress-score/*.test.ts"],
    fileParallelism: false,
    testTimeout: 60000,
  },
});

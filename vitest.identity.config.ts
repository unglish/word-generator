import { defineConfig } from "vitest/config";

// Archive fixtures require the pinned standalone evaluator documented in docs/phoneme-identity.md.
export default defineConfig({
  test: {
    include: ["src/phonology/identity.test.ts", "evaluation/quality/probes/phoneme-identity.test.ts"],
    pool: "threads",
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});

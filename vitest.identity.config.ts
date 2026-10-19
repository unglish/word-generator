import { defineConfig } from "vitest/config";

// Archive fixtures pin their own words as the original; see docs/phoneme-identity.md.
export default defineConfig({
  test: {
    include: ["src/phonology/identity.test.ts", "evaluation/quality/probes/phoneme-identity.test.ts"],
    pool: "threads",
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});

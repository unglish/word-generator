import { bench, describe } from "vitest";
import { generateWord } from "./generate.js";

/**
 * Performance benchmarks for word generation.
 *
 * Run locally with `npx vitest bench --run` to inspect throughput; these make
 * no assertions. The CI regression gate is `npm run test:perf`
 * (src/core/generate.perf.test.ts), run on every push to main before deploy.
 *
 * Baseline (2026-02-08): ~11,000 words/sec on a dev machine. The CI floor is
 * MIN_WORDS_PER_SEC in generate.perf.test.ts.
 */

describe("Word Generation Performance", () => {
  bench("generate single word", () => {
    generateWord();
  });

  bench("generate word with seed", () => {
    generateWord({ seed: 42 });
  });

  bench("generate 100 words", () => {
    for (let i = 0; i < 100; i++) {
      generateWord({ seed: i });
    }
  });
});

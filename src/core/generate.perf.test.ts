import { describe, it, expect } from "vitest";
import { generateWord } from "./generate.js";

/**
 * Performance regression gate for word generation.
 * 
 * Measures wall-clock throughput and asserts a minimum words/sec floor.
 * Threshold is set conservatively to avoid CI flakiness while still
 * catching meaningful regressions.
 * 
 * Update MIN_WORDS_PER_SEC if you intentionally accept a speed tradeoff.
 */

// CI runners are noisier than local machines, so use a slightly lower floor.
const MIN_WORDS_PER_SEC = process.env.CI === "true" ? 4300 : 4500;
const SAMPLE_SIZE = 10000;
const WARMUP_COUNT = 50;
const VARIANCE_TRIALS = 3;
const VARIANCE_BATCHES = 5;
const VARIANCE_BATCH_SIZE = 200;
const MAX_MEDIAN_VARIANCE = process.env.CI === "true" ? 4.0 : 3.0;

describe("Word Generation Performance", () => {
  it(`should generate at least ${MIN_WORDS_PER_SEC} words/sec`, { timeout: 20_000 }, () => {
    // Warmup — let V8 JIT compile
    for (let i = 0; i < WARMUP_COUNT; i++) {
      generateWord({ seed: i });
    }

    const start = performance.now();
    for (let i = 0; i < SAMPLE_SIZE; i++) {
      generateWord({ seed: i + WARMUP_COUNT });
    }
    const elapsed = performance.now() - start;
    const wordsPerSec = (SAMPLE_SIZE / elapsed) * 1000;

    console.log(`\n⚡ Performance: ${Math.round(wordsPerSec)} words/sec (${SAMPLE_SIZE} words in ${Math.round(elapsed)}ms)`);
    console.log(`   Floor: ${MIN_WORDS_PER_SEC} words/sec\n`);

    expect(wordsPerSec).toBeGreaterThanOrEqual(MIN_WORDS_PER_SEC);
  });

  it("should not degrade significantly with sequential seeds", { timeout: 20_000 }, () => {
    // Self-contained warmup so this test stays stable regardless of run order.
    for (let i = 0; i < WARMUP_COUNT; i++) {
      generateWord({ seed: 900_000 + i });
    }

    const trialVariances: number[] = [];

    for (let trial = 0; trial < VARIANCE_TRIALS; trial++) {
      const times: number[] = [];
      const trialSeedOffset = trial * 100_000;

      for (let batch = 0; batch < VARIANCE_BATCHES; batch++) {
        const start = performance.now();
        for (let i = 0; i < VARIANCE_BATCH_SIZE; i++) {
          generateWord({ seed: trialSeedOffset + batch * VARIANCE_BATCH_SIZE + i });
        }
        times.push(performance.now() - start);
      }

      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      trialVariances.push(maxTime / minTime);
    }

    const sortedVariances = [...trialVariances].sort((a, b) => a - b);
    const medianVariance = sortedVariances[Math.floor(sortedVariances.length / 2)];

    console.log(`⚡ Batch variance trials: ${trialVariances.map(v => `${v.toFixed(2)}x`).join(", ")} (median ${medianVariance.toFixed(2)}x)`);
    console.log(`   Median variance threshold: < ${MAX_MEDIAN_VARIANCE.toFixed(1)}x`);

    expect(medianVariance).toBeLessThan(MAX_MEDIAN_VARIANCE);
  });
});

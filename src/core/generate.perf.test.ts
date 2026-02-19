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

// CI floor — top-down planning with single-sample + tweak distribution.
const MIN_WORDS_PER_SEC = 4500;
const SAMPLE_SIZE = 10000;
const WARMUP_COUNT = 50;

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

    expect(wordsPerSec).toBeGreaterThan(MIN_WORDS_PER_SEC);
  });

  it("should not degrade significantly with sequential seeds", { timeout: 20_000 }, () => {
    // Checks that seed-based generation doesn't have pathological cases
    const times: number[] = [];

    for (let batch = 0; batch < 5; batch++) {
      const start = performance.now();
      for (let i = 0; i < 200; i++) {
        generateWord({ seed: batch * 200 + i });
      }
      times.push(performance.now() - start);
    }

    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    const variance = maxTime / minTime;

    console.log(`⚡ Batch variance: ${variance.toFixed(2)}x (max ${Math.round(maxTime)}ms / min ${Math.round(minTime)}ms)`);

    // No batch should be more than 3x slower than the fastest
    expect(variance).toBeLessThan(3);
  });
});

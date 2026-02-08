import { bench, describe, expect } from 'vitest';
import { generateWord } from './generate.js';

/**
 * Performance benchmarks for word generation.
 * 
 * These act as a regression gate — if generation speed drops
 * significantly, the benchmark assertions will fail in CI.
 * 
 * Current baseline (2026-02-08): ~11,000 words/sec on dev, ~5,000+ expected on CI runners.
 * Threshold is set conservatively to catch real regressions,
 * not CI noise.
 */

describe('Word Generation Performance', () => {
  bench('generate single word', () => {
    generateWord();
  });

  bench('generate word with seed', () => {
    generateWord({ seed: 42 });
  });

  bench('generate 100 words', () => {
    for (let i = 0; i < 100; i++) {
      generateWord({ seed: i });
    }
  });
});

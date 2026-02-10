import { describe, it, expect } from 'vitest';
import { createSeededRng, createDefaultRng, RNG } from './random';

describe('createSeededRng (Mulberry32)', () => {
  it('returns values in [0, 1)', () => {
    const rng = createSeededRng(42);
    for (let i = 0; i < 10_000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('is deterministic — same seed produces same sequence', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it('different seeds produce different sequences', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(43);
    const aVals = Array.from({ length: 10 }, () => a());
    const bVals = Array.from({ length: 10 }, () => b());
    // Extremely unlikely (impossible in practice) for all 10 to match
    const allSame = aVals.every((v, i) => v === bVals[i]);
    expect(allSame).toBe(false);
  });

  it('independent instances do not interfere', () => {
    const a = createSeededRng(42);
    const reference = createSeededRng(42);

    // Advance 'a' by 5 steps
    for (let i = 0; i < 5; i++) a();

    // Create a new instance with different seed, use it
    const b = createSeededRng(999);
    for (let i = 0; i < 100; i++) b();

    // Advance reference by 5 steps
    for (let i = 0; i < 5; i++) reference();

    // 'a' and 'reference' should still be in sync
    expect(a()).toBe(reference());
  });

  it('has reasonable uniformity across 10 bins', () => {
    const rng = createSeededRng(12345);
    const bins = new Array(10).fill(0);
    const N = 100_000;
    for (let i = 0; i < N; i++) {
      bins[Math.floor(rng() * 10)]++;
    }
    const expected = N / 10;
    for (const count of bins) {
      // Each bin should be within 5% of expected
      expect(Math.abs(count - expected) / expected).toBeLessThan(0.05);
    }
  });

  it('seed 0 works (not degenerate)', () => {
    const rng = createSeededRng(0);
    const vals = new Set(Array.from({ length: 100 }, () => rng()));
    // Should produce many distinct values, not stuck
    expect(vals.size).toBeGreaterThan(90);
  });
});

describe('createDefaultRng', () => {
  it('returns values in [0, 1)', () => {
    const rng = createDefaultRng();
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('is non-deterministic (two instances produce different sequences)', () => {
    const a = createDefaultRng();
    const b = createDefaultRng();
    const aVals = Array.from({ length: 20 }, () => a());
    const bVals = Array.from({ length: 20 }, () => b());
    // Could theoretically match but probability is astronomically low
    const allSame = aVals.every((v, i) => v === bVals[i]);
    expect(allSame).toBe(false);
  });
});

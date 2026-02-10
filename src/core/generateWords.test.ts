import { describe, it, expect } from 'vitest';
import { generateWord, generateWords } from './generate';
import { createSeededRng } from '../utils/random';

describe('generateWords (batch API)', () => {
  it('returns the requested number of words', () => {
    const words = generateWords(10, { seed: 42 });
    expect(words).toHaveLength(10);
  });

  it('is deterministic — same seed produces same batch', () => {
    const a = generateWords(20, { seed: 42 });
    const b = generateWords(20, { seed: 42 });
    for (let i = 0; i < 20; i++) {
      expect(a[i].written.clean).toBe(b[i].written.clean);
      expect(a[i].pronunciation).toBe(b[i].pronunciation);
    }
  });

  it('produces different words within a batch', () => {
    const words = generateWords(50, { seed: 42 });
    const uniques = new Set(words.map(w => w.written.clean));
    // With 50 words, should have high variety. Allow some collisions but not many.
    expect(uniques.size).toBeGreaterThan(40);
  });

  it('different seeds produce different batches', () => {
    const a = generateWords(10, { seed: 42 });
    const b = generateWords(10, { seed: 99 });
    const aWords = a.map(w => w.written.clean).join(',');
    const bWords = b.map(w => w.written.clean).join(',');
    expect(aWords).not.toBe(bWords);
  });

  it('batch is NOT equivalent to N individual seeded calls', () => {
    // N individual calls with the same seed all produce the SAME word
    // (each creates its own Mulberry32 from seed 42).
    // Batch shares one RNG so words differ.
    const single = generateWord({ seed: 42 }).written.clean;
    const batch = generateWords(5, { seed: 42 });

    // All individual calls produce the same word
    for (let i = 0; i < 5; i++) {
      expect(generateWord({ seed: 42 }).written.clean).toBe(single);
    }

    // Batch words are different from each other (and most differ from the single-call word)
    const batchWords = batch.map(w => w.written.clean);
    const uniqueBatch = new Set(batchWords);
    expect(uniqueBatch.size).toBeGreaterThan(1);
  });

  it('handles count of 0', () => {
    const words = generateWords(0, { seed: 42 });
    expect(words).toHaveLength(0);
  });

  it('handles count of 1', () => {
    const words = generateWords(1, { seed: 42 });
    expect(words).toHaveLength(1);
    expect(words[0].written.clean).toBeTruthy();
  });

  it('respects syllableCount option', () => {
    const words = generateWords(10, { seed: 42, syllableCount: 2 });
    for (const word of words) {
      expect(word.syllables).toHaveLength(2);
    }
  });
});

describe('generateWord RNG priority', () => {
  it('seed produces deterministic output', () => {
    const a = generateWord({ seed: 42 });
    const b = generateWord({ seed: 42 });
    expect(a.written.clean).toBe(b.written.clean);
  });

  it('custom rand takes priority over seed', () => {
    // Create a custom RNG from seed 99
    const customRng = createSeededRng(99);
    const withCustom = generateWord({ rand: customRng, seed: 42 });

    // This should match seed 99, not seed 42
    const fromSeed99Rng = createSeededRng(99);
    const withSeed99 = generateWord({ rand: fromSeed99Rng });

    const fromSeed42 = generateWord({ seed: 42 });

    expect(withCustom.written.clean).toBe(withSeed99.written.clean);
    // Almost certainly different from seed 42
    // (tiny chance of collision, but astronomically unlikely)
  });

  it('custom rand function is used for generation', () => {
    let callCount = 0;
    const countingRng = createSeededRng(42);
    const trackingRng = () => {
      callCount++;
      return countingRng();
    };

    generateWord({ rand: trackingRng });
    expect(callCount).toBeGreaterThan(0);
  });

  it('interleaved seeded calls do not interfere', () => {
    // Generate with seed 42
    const word42a = generateWord({ seed: 42 });
    // Generate with seed 99 (should not affect seed 42)
    generateWord({ seed: 99 });
    // Generate with seed 42 again — should be identical to first
    const word42b = generateWord({ seed: 42 });

    expect(word42a.written.clean).toBe(word42b.written.clean);
  });
});

import { describe, it, expect } from 'vitest';
import { generateWord } from '../core/generate';
import { scoreWord } from './score';
import { createSeededRandom } from '../utils/createSeededRandom';
import { overrideRand, resetRand } from '../utils/random';

// Edge case tests

describe('scoreWord edge cases', () => {
  it('returns -Infinity for empty input', () => {
    expect(scoreWord('')).toBe(Number.NEGATIVE_INFINITY);
  });

  it('returns -Infinity for a single phoneme', () => {
    expect(scoreWord('a')).toBe(Number.NEGATIVE_INFINITY);
  });

  it('handles unknown phonemes gracefully', () => {
    const val = scoreWord('ɸu');
    expect(Number.isFinite(val)).toBe(true);
  });
});

// Sample words for reference

describe('scoreWord sample words', () => {
  const samples = [
    { pron: 'blɪk', label: 'blick' },
    { pron: 'bnɪk', label: 'bnick' },
    { pron: 'zskw', label: 'zzqw' },
  ];

  samples.forEach(({ pron, label }) => {
    it(`scores ${label}`, () => {
      const score = scoreWord(pron);
      expect(Number.isFinite(score)).toBe(true);
    });
  });
});

// Generate many words and log stats

describe('score distribution', () => {
  it('scores 100 generated words', () => {
    const rng = createSeededRandom(42);
    overrideRand(rng);
    const scores: number[] = [];
    for (let i = 0; i < 100; i++) {
      const word = generateWord({});
      scores.push(scoreWord(word));
    }
    resetRand();
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    console.log({ mean, min, max });
    expect(scores.length).toBe(100);
  });
});

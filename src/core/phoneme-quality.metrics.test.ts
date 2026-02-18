import { describe, expect, it } from 'vitest';
import { computePhonemeQualityMetrics } from './phoneme-quality.js';

describe('computePhonemeQualityMetrics', () => {
  it('classifies shared and generated-only phonemes correctly', () => {
    const generated = {
      a: 70,
      b: 20,
      x: 10,
    };
    const baseline = {
      a: 50,
      b: 50,
      c: 10,
    };

    const metrics = computePhonemeQualityMetrics(generated, baseline, 0);

    expect(metrics.sharedKeyCount).toBe(2);
    expect(metrics.generatedOnlyPhonemes.map(x => x.phoneme)).toEqual(['x']);
    expect(metrics.nonCmuMassPct).toBeCloseTo(10, 8);
    expect(Math.abs(metrics.coverageAdjustedR)).toBeLessThanOrEqual(Math.abs(metrics.sharedPearsonR));
  });
});

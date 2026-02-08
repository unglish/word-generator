import { describe, it, expect } from 'vitest';
import { scoreArpabetWords } from './score.js';
import englishSample from './english-sample.json' with { type: 'json' };
import englishBaseline from './english-baseline.json' with { type: 'json' };

/**
 * Baseline validation tests.
 * 
 * These verify that the scorer itself is working correctly by scoring
 * known English words against the cached baseline. Only needs to run
 * when scoring infrastructure changes — not on every CI run.
 * 
 * Run explicitly: npx vitest run src/phonotactic/phonotactic.baseline.test.ts
 */

describe('English Baseline Validation', () => {
  it('scores 100 CMU dict words within expected range', () => {
    const arpabetWords = englishSample.map((w: { arpabet: string }) => w.arpabet);
    const scored = scoreArpabetWords(arpabetWords);
    const scores = scored.map(s => s.score).filter(s => !isNaN(s) && isFinite(s));
    scores.sort((a, b) => a - b);

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const min = scores[0];

    console.log(`\n📊 English baseline: mean=${mean.toFixed(2)} min=${min.toFixed(2)} n=${scores.length}`);
    console.log(`   Cached baseline:  mean=${englishBaseline.scores.mean} min=${englishBaseline.scores.min}`);
    console.log(`   Drift: ${Math.abs(mean - englishBaseline.scores.mean).toFixed(2)} points\n`);

    // Mean should be within 2 points of cached baseline
    expect(mean).toBeGreaterThan(englishBaseline.scores.mean - 2);
    expect(mean).toBeLessThan(englishBaseline.scores.mean + 2);
    
    // Sanity: English words should score better than -25
    expect(mean).toBeGreaterThan(-25);
  }, 60_000);
});

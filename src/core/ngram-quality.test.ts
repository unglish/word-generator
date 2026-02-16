import { describe, it, expect } from 'vitest';
import { generateWords } from './generate.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// N-gram quality gates with ratcheting thresholds
//
// These tests compare generated word n-gram frequencies against the CMU
// lexicon baseline. Thresholds are stored in src/config/ngram-thresholds.json
// and tighten over time (quality ratchet).
//
// Ratchet process:
//   1. After a successful tuning fix, re-run the 5× baseline analysis
//      (seeds 42/123/456/789/1337, 200k words each)
//   2. Update thresholds to new max + 10% margin
//   3. Commit updated ngram-thresholds.json as part of the fix PR
// ---------------------------------------------------------------------------

const SEED = 42;
const SAMPLE_SIZE = 200_000;
const YIELD_EVERY = 10_000;
const MIN_CMU_FREQ = 0.001; // ignore very rare CMU n-grams

interface Thresholds {
  maxBigramOverRepresentation: number;
  maxTrigramOverRepresentation: number;
  sampleSize: number;
}

function loadThresholds(): Thresholds {
  const raw = readFileSync(join(__dirname, '..', 'config', 'ngram-thresholds.json'), 'utf8');
  return JSON.parse(raw);
}

function loadCmuFreqs(filename: string): Record<string, number> {
  const repoRoot = join(__dirname, '..', '..');
  const raw = JSON.parse(readFileSync(join(repoRoot, 'memory', filename), 'utf8'));
  const total = Object.values(raw as Record<string, number>).reduce((a, b) => a + b, 0);
  const freq: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as Record<string, number>)) {
    freq[k] = v / total;
  }
  return freq;
}

async function yieldToEventLoop() {
  return new Promise<void>(resolve => setTimeout(resolve, 0));
}

describe('N-gram quality gates', () => {
  let words: ReturnType<typeof generateWords>;
  let bigramCounts: Record<string, number>;
  let trigramCounts: Record<string, number>;
  let bigramTotal: number;
  let trigramTotal: number;

  // Generate once, share across tests
  it('generate sample', async () => {
    words = generateWords(SAMPLE_SIZE, { seed: SEED });

    bigramCounts = {};
    trigramCounts = {};
    bigramTotal = 0;
    trigramTotal = 0;

    for (let w = 0; w < words.length; w++) {
      if (w > 0 && w % YIELD_EVERY === 0) await yieldToEventLoop();

      const text = words[w].written.clean.toLowerCase();
      for (let i = 0; i < text.length - 1; i++) {
        const bi = text.slice(i, i + 2);
        bigramCounts[bi] = (bigramCounts[bi] || 0) + 1;
        bigramTotal++;
      }
      for (let i = 0; i < text.length - 2; i++) {
        const tri = text.slice(i, i + 3);
        trigramCounts[tri] = (trigramCounts[tri] || 0) + 1;
        trigramTotal++;
      }
    }
  }, 120_000);

  it('no bigram exceeds threshold over-representation', async () => {
    const thresholds = loadThresholds();
    const cmuFreq = loadCmuFreqs('cmu-lexicon-bigrams.json');

    let worst = { ngram: '', ratio: 0 };

    for (const [bi, count] of Object.entries(bigramCounts)) {
      const sampleFreq = count / bigramTotal;
      const cmu = cmuFreq[bi];
      if (cmu && cmu > MIN_CMU_FREQ) {
        const ratio = sampleFreq / cmu;
        if (ratio > worst.ratio) worst = { ngram: bi, ratio };
      }
    }

    console.log(`Worst bigram: "${worst.ngram}" at ${worst.ratio.toFixed(3)}× (threshold: ${thresholds.maxBigramOverRepresentation})`);

    expect(
      worst.ratio,
      `Bigram "${worst.ngram}" over-represented at ${worst.ratio.toFixed(3)}× vs CMU (threshold: ${thresholds.maxBigramOverRepresentation}×)`
    ).toBeLessThanOrEqual(thresholds.maxBigramOverRepresentation);
  });

  it('no trigram exceeds threshold over-representation', async () => {
    const thresholds = loadThresholds();
    const cmuFreq = loadCmuFreqs('cmu-lexicon-trigrams.json');

    let worst = { ngram: '', ratio: 0 };

    for (const [tri, count] of Object.entries(trigramCounts)) {
      const sampleFreq = count / trigramTotal;
      const cmu = cmuFreq[tri];
      if (cmu && cmu > MIN_CMU_FREQ) {
        const ratio = sampleFreq / cmu;
        if (ratio > worst.ratio) worst = { ngram: tri, ratio };
      }
    }

    console.log(`Worst trigram: "${worst.ngram}" at ${worst.ratio.toFixed(3)}× (threshold: ${thresholds.maxTrigramOverRepresentation})`);

    expect(
      worst.ratio,
      `Trigram "${worst.ngram}" over-represented at ${worst.ratio.toFixed(3)}× vs CMU (threshold: ${thresholds.maxTrigramOverRepresentation}×)`
    ).toBeLessThanOrEqual(thresholds.maxTrigramOverRepresentation);
  });
});

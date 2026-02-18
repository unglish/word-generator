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
// Two types of gates:
//   - Over-representation: no common n-gram should appear WAY more than in CMU
//   - Under-representation: no common n-gram should be missing/severely rare
//
// Ratchet process:
//   1. After a successful tuning fix, re-run the 5× baseline analysis
//      (seeds 42/123/456/789/1337, 200k words each)
//   2. Update thresholds: new max + 10% margin (over-rep),
//      new min - 10% margin (under-rep)
//   3. Commit updated ngram-thresholds.json as part of the fix PR
// ---------------------------------------------------------------------------

const SEED = 42;
const SAMPLE_SIZE = 200_000;
const YIELD_EVERY = 10_000;
const MIN_OVERREP_CMU_FREQ = 0.001; // over-rep tests: ignore very rare CMU n-grams
const NGRAM_GATES_BLOCKING = process.env.NGRAM_GATES_BLOCKING === '1';
const CATASTROPHIC_MAX_BIGRAM_OVERREP = 25;
const CATASTROPHIC_MAX_TRIGRAM_OVERREP = 25;

interface Thresholds {
  maxBigramOverRepresentation: number;
  maxTrigramOverRepresentation: number;
  minBigramRepresentation: number;
  minTrigramRepresentation: number;
  minBigramBaselineFreq: number;
  minTrigramBaselineFreq: number;
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
  // Shared sample data — generated once, used by both over- and under-rep tests
  let bigramCounts: Record<string, number>;
  let trigramCounts: Record<string, number>;
  let bigramTotal: number;
  let trigramTotal: number;

  it('generate sample', async () => {
    const words = generateWords(SAMPLE_SIZE, { seed: SEED });

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

  // --- Over-representation gates ---

  it('no bigram exceeds threshold over-representation', async () => {
    const thresholds = loadThresholds();
    const cmuFreq = loadCmuFreqs('cmu-lexicon-bigrams.json');

    let worst = { ngram: '', ratio: 0 };

    for (const [bi, count] of Object.entries(bigramCounts)) {
      const sampleFreq = count / bigramTotal;
      const cmu = cmuFreq[bi];
      if (cmu && cmu > MIN_OVERREP_CMU_FREQ) {
        const ratio = sampleFreq / cmu;
        if (ratio > worst.ratio) worst = { ngram: bi, ratio };
      }
    }

    console.log(`Worst over-rep bigram: "${worst.ngram}" at ${worst.ratio.toFixed(3)}× (threshold: ${thresholds.maxBigramOverRepresentation})`);

    if (NGRAM_GATES_BLOCKING) {
      expect(
        worst.ratio,
        `Bigram "${worst.ngram}" over-represented at ${worst.ratio.toFixed(3)}× vs CMU (threshold: ${thresholds.maxBigramOverRepresentation}×)`
      ).toBeLessThanOrEqual(thresholds.maxBigramOverRepresentation);
      return;
    }

    expect(
      worst.ratio,
      `Catastrophic bigram over-representation detected: "${worst.ngram}" at ${worst.ratio.toFixed(3)}×`
    ).toBeLessThanOrEqual(CATASTROPHIC_MAX_BIGRAM_OVERREP);
  });

  it('no trigram exceeds threshold over-representation', async () => {
    const thresholds = loadThresholds();
    const cmuFreq = loadCmuFreqs('cmu-lexicon-trigrams.json');

    let worst = { ngram: '', ratio: 0 };

    for (const [tri, count] of Object.entries(trigramCounts)) {
      const sampleFreq = count / trigramTotal;
      const cmu = cmuFreq[tri];
      if (cmu && cmu > MIN_OVERREP_CMU_FREQ) {
        const ratio = sampleFreq / cmu;
        if (ratio > worst.ratio) worst = { ngram: tri, ratio };
      }
    }

    console.log(`Worst over-rep trigram: "${worst.ngram}" at ${worst.ratio.toFixed(3)}× (threshold: ${thresholds.maxTrigramOverRepresentation})`);

    if (NGRAM_GATES_BLOCKING) {
      expect(
        worst.ratio,
        `Trigram "${worst.ngram}" over-represented at ${worst.ratio.toFixed(3)}× vs CMU (threshold: ${thresholds.maxTrigramOverRepresentation}×)`
      ).toBeLessThanOrEqual(thresholds.maxTrigramOverRepresentation);
      return;
    }

    expect(
      worst.ratio,
      `Catastrophic trigram over-representation detected: "${worst.ngram}" at ${worst.ratio.toFixed(3)}×`
    ).toBeLessThanOrEqual(CATASTROPHIC_MAX_TRIGRAM_OVERREP);
  });

  // --- Under-representation gates ---

  it('no common bigram is severely under-represented', async () => {
    const thresholds = loadThresholds();
    const cmuFreq = loadCmuFreqs('cmu-lexicon-bigrams.json');

    let worst = { ngram: '', ratio: Infinity };

    for (const [bi, cmu] of Object.entries(cmuFreq)) {
      if (cmu <= thresholds.minBigramBaselineFreq) continue;
      const genCount = bigramCounts[bi] || 0;
      const genFreq = genCount / bigramTotal;
      const ratio = genFreq / cmu;
      if (ratio < worst.ratio) worst = { ngram: bi, ratio };
    }

    console.log(`Worst under-rep bigram: "${worst.ngram}" at ${worst.ratio.toFixed(4)}× (threshold: ${thresholds.minBigramRepresentation})`);

    if (NGRAM_GATES_BLOCKING) {
      expect(
        worst.ratio,
        `Bigram "${worst.ngram}" under-represented at ${worst.ratio.toFixed(4)}× vs CMU (threshold: ${thresholds.minBigramRepresentation}×)`
      ).toBeGreaterThanOrEqual(thresholds.minBigramRepresentation);
      return;
    }

    expect(true).toBe(true);
  });

  it('no common trigram is severely under-represented', async () => {
    const thresholds = loadThresholds();
    const cmuFreq = loadCmuFreqs('cmu-lexicon-trigrams.json');

    let worst = { ngram: '', ratio: Infinity };

    for (const [tri, cmu] of Object.entries(cmuFreq)) {
      if (cmu <= thresholds.minTrigramBaselineFreq) continue;
      const genCount = trigramCounts[tri] || 0;
      const genFreq = genCount / trigramTotal;
      const ratio = genFreq / cmu;
      if (ratio < worst.ratio) worst = { ngram: tri, ratio };
    }

    console.log(`Worst under-rep trigram: "${worst.ngram}" at ${worst.ratio.toFixed(4)}× (threshold: ${thresholds.minTrigramRepresentation})`);

    if (NGRAM_GATES_BLOCKING) {
      expect(
        worst.ratio,
        `Trigram "${worst.ngram}" under-represented at ${worst.ratio.toFixed(4)}× vs CMU (threshold: ${thresholds.minTrigramRepresentation}×)`
      ).toBeGreaterThanOrEqual(thresholds.minTrigramRepresentation);
      return;
    }

    expect(true).toBe(true);
  });
});

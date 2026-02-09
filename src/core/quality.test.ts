import { describe, it, expect, beforeAll } from 'vitest';
import { generateWord } from './generate.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Top 100 English words by frequency (Oxford / Corpus of Contemporary American English).
// Single-letter words ('a', 'i') excluded — trivially generated and not meaningful signal.
const COMMON_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'in', 'that', 'have', 'it', 'for',
  'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but',
  'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an',
  'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up',
  'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make',
  'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into',
  'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after',
  'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new',
  'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'are', 'was',
  'had', 'been',
]);

const MAX_ITERATIONS = 5_000_000;
const MILESTONES = [50, 75, 90, 100] as const;
const TRIALS = 5;
const GATE_SAMPLE_SIZE = 200_000;

const VOWELS = new Set('aeiouy'.split(''));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isConsonantLetter(ch: string): boolean {
  return /[a-z]/i.test(ch) && !VOWELS.has(ch.toLowerCase());
}

function longestConsonantRun(word: string): number {
  let max = 0, cur = 0;
  for (const ch of word) {
    if (isConsonantLetter(ch)) { cur++; if (cur > max) max = cur; }
    else cur = 0;
  }
  return max;
}

function median(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : Math.round((nums[mid - 1] + nums[mid]) / 2);
}

const fmtNumber = new Intl.NumberFormat('en-US');
const fmt = (n: number | null | undefined) =>
  n !== null && n !== undefined ? fmtNumber.format(n) : 'not reached';

// ---------------------------------------------------------------------------
// Quality Benchmark
// ---------------------------------------------------------------------------

// NOTE: Test ordering matters. Vitest runs tests within a describe block
// sequentially in declaration order. The trial tests must run before the
// gates/metrics block so that trialResults is populated for the report.

describe('Quality Benchmark', () => {
  const trialResults: Array<Record<number, number | null>> = [];

  // -------------------------------------------------------------------------
  // Common Words Trials
  // -------------------------------------------------------------------------

  for (let trial = 0; trial < TRIALS; trial++) {
    it(`Common words trial ${trial + 1}/${TRIALS}`, { timeout: 600_000 }, () => {
      const found = new Set<string>();
      const milestoneHits: Record<number, number | null> = {};
      for (const m of MILESTONES) milestoneHits[m] = null;

      const seedOffset = trial * MAX_ITERATIONS;

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const word = generateWord({ seed: seedOffset + i });
        const written = word.written.clean.toLowerCase();

        if (COMMON_WORDS.has(written)) {
          found.add(written);
          for (const m of MILESTONES) {
            if (milestoneHits[m] === null && found.size >= m) {
              milestoneHits[m] = i + 1;
            }
          }
          if (found.size >= COMMON_WORDS.size) break;
        }
      }

      console.log(`Trial ${trial + 1}: found ${found.size}/${COMMON_WORDS.size} common words`);
      for (const m of MILESTONES) {
        console.log(`  ${m} words: ${fmt(milestoneHits[m])}`);
      }

      trialResults.push(milestoneHits);
    });
  }

  // -------------------------------------------------------------------------
  // Gates & Metrics (200k sample)
  // -------------------------------------------------------------------------

  describe('Quality Gates & Metrics', () => {
    let gateWords: string[] = [];

    // Shared gate counts — computed once in beforeAll, asserted individually
    let fiveConsCount = 0;
    let ngxCount = 0;
    let bkCount = 0;
    let pkCount = 0;
    let fourConsCount = 0;
    let dkCount = 0;
    let cktCount = 0;
    let owngsCount = 0;
    let rengTengCount = 0;
    let avgLength = 0;
    let uniqueRate = 0;
    let lengthDistribution: Record<string, number> = {};

    beforeAll(() => {
      // Generate 200k words
      gateWords = [];
      for (let i = 0; i < GATE_SAMPLE_SIZE; i++) {
        gateWords.push(generateWord({ seed: i }).written.clean.toLowerCase());
      }

      // Single pass to compute all counts
      const buckets: Record<string, number> = { '1': 0, '2-3': 0, '4-5': 0, '6-8': 0, '9-12': 0, '13+': 0 };
      let totalLen = 0;
      const uniqueWords = new Set<string>();

      for (const w of gateWords) {
        const run = longestConsonantRun(w);
        if (run >= 5) fiveConsCount++;
        if (run >= 4) fourConsCount++;
        if (w.includes('ngx')) ngxCount++;
        if (w.includes('bk')) bkCount++;
        if (w.includes('pk')) pkCount++;
        if (w.includes('dk')) dkCount++;
        if (w.includes('ckt')) cktCount++;
        if (/owngs/.test(w)) owngsCount++;
        if (/[rt]eng$/.test(w)) rengTengCount++;

        totalLen += w.length;
        uniqueWords.add(w);

        const len = w.length;
        if (len <= 1) buckets['1']++;
        else if (len <= 3) buckets['2-3']++;
        else if (len <= 5) buckets['4-5']++;
        else if (len <= 8) buckets['6-8']++;
        else if (len <= 12) buckets['9-12']++;
        else buckets['13+']++;
      }

      avgLength = +(totalLen / gateWords.length).toFixed(1);
      uniqueRate = +(uniqueWords.size / gateWords.length * 100).toFixed(1);
      lengthDistribution = buckets;
    }, 120_000);

    // Hard gates
    it('Gate: no 5+ consecutive consonant letters', () => {
      expect(fiveConsCount).toBe(0);
    });

    it('Gate: no ngx occurrences', () => {
      expect(ngxCount).toBe(0);
    });

    it('Gate: bk < 50', () => {
      expect(bkCount).toBeLessThan(50);
    });

    it('Gate: pk < 50', () => {
      expect(pkCount).toBeLessThan(50);
    });

    // Report generation
    it('Write quality report', () => {
      console.log('\n=== Quality Metrics ===');
      console.log(`5+ consonant runs: ${fiveConsCount}`);
      console.log(`ngx: ${ngxCount}`);
      console.log(`bk: ${bkCount}`);
      console.log(`pk: ${pkCount}`);
      console.log(`4-cons clusters: ${fourConsCount} (${(fourConsCount / gateWords.length * 100).toFixed(2)}%)`);
      console.log(`dk: ${dkCount}`);
      console.log(`ckt: ${cktCount}`);
      console.log(`-owngs: ${owngsCount}`);
      console.log(`-reng/-teng: ${rengTengCount}`);
      console.log(`Avg length: ${avgLength}`);
      console.log(`Unique rate: ${uniqueRate}%`);
      console.log(`Length distribution:`, lengthDistribution);

      // Build common words section from trial results (may be empty if gates-only run)
      const milestoneData: Record<string, { median: number | null; values: (number | null)[] }> = {};
      for (const m of MILESTONES) {
        const values = trialResults.map(t => t[m]);
        milestoneData[String(m)] = { median: median(values), values };
      }

      const fullReport = {
        commonWords: trialResults.length > 0
          ? {
              trials: trialResults.length,
              maxIterations: MAX_ITERATIONS,
              milestones: milestoneData,
            }
          : { trials: 0, maxIterations: MAX_ITERATIONS, milestones: {}, note: 'trials skipped' },
        gates: {
          fiveConsecutiveConsonants: fiveConsCount,
          ngx: ngxCount,
          bk: bkCount,
          pk: pkCount,
        },
        metrics: {
          fourConsonantClusters: { count: fourConsCount, rate: +(fourConsCount / gateWords.length * 100).toFixed(2) },
          dk: dkCount,
          ckt: cktCount,
          owngs: owngsCount,
          rengTeng: rengTengCount,
          avgLength,
          uniqueRate,
          lengthDistribution,
        },
      };

      // Write report to repo root (vitest cwd)
      const reportPath = join(process.cwd(), 'quality-report.json');
      writeFileSync(reportPath, JSON.stringify(fullReport, null, 2) + '\n');
      console.log(`\nReport written to ${reportPath}`);
    });
  });
});

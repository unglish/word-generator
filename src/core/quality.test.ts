import { describe, it, expect } from 'vitest';
import { generateWord } from './generate.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COMMON_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
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

// ---------------------------------------------------------------------------
// Shared state for the report
// ---------------------------------------------------------------------------

const report: Record<string, unknown> = {};

// ---------------------------------------------------------------------------
// Common Words Trials
// ---------------------------------------------------------------------------

describe('Quality Benchmark', () => {
  const trialResults: Array<Record<number, number | null>> = [];

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
          if (found.size >= 100) break;
        }
      }

      console.log(`Trial ${trial + 1}: found ${found.size}/100 common words`);
      for (const m of MILESTONES) {
        const v = milestoneHits[m];
        console.log(`  ${m} words: ${v !== null ? v.toLocaleString() : 'not reached'}`);
      }

      trialResults.push(milestoneHits);
    });
  }

  // -------------------------------------------------------------------------
  // Gates & Metrics (200k sample)
  // -------------------------------------------------------------------------

  let gateWords: string[] = [];

  it('Generate 200k sample', { timeout: 120_000 }, () => {
    gateWords = [];
    for (let i = 0; i < GATE_SAMPLE_SIZE; i++) {
      gateWords.push(generateWord({ seed: i }).written.clean.toLowerCase());
    }
    expect(gateWords.length).toBe(GATE_SAMPLE_SIZE);
  });

  // Hard gates
  it('Gate: no 5+ consecutive consonant letters', () => {
    const violations = gateWords.filter(w => longestConsonantRun(w) >= 5);
    console.log(`5+ consonant runs: ${violations.length}`);
    expect(violations.length).toBe(0);
  });

  it('Gate: no ngx occurrences', () => {
    const count = gateWords.filter(w => w.includes('ngx')).length;
    console.log(`ngx: ${count}`);
    expect(count).toBe(0);
  });

  it('Gate: bk < 50', () => {
    const count = gateWords.filter(w => w.includes('bk')).length;
    console.log(`bk: ${count}`);
    expect(count).toBeLessThan(50);
  });

  it('Gate: pk < 50', () => {
    const count = gateWords.filter(w => w.includes('pk')).length;
    console.log(`pk: ${count}`);
    expect(count).toBeLessThan(50);
  });

  // Quality metrics & report generation
  it('Compute metrics and write report', { timeout: 30_000 }, () => {
    // Metrics
    const fourConsCount = gateWords.filter(w => longestConsonantRun(w) >= 4).length;
    const dkCount = gateWords.filter(w => w.includes('dk')).length;
    const cktCount = gateWords.filter(w => w.includes('ckt')).length;
    const owngsCount = gateWords.filter(w => /owngs/.test(w)).length;
    const rengTengCount = gateWords.filter(w => /[rt]eng$/.test(w)).length;

    const totalLen = gateWords.reduce((s, w) => s + w.length, 0);
    const avgLength = +(totalLen / gateWords.length).toFixed(1);

    const uniqueWords = new Set(gateWords);
    const uniqueRate = +(uniqueWords.size / gateWords.length * 100).toFixed(1);

    // Length distribution
    const buckets = { '1': 0, '2-3': 0, '4-5': 0, '6-8': 0, '9-12': 0, '13+': 0 };
    for (const w of gateWords) {
      const len = w.length;
      if (len <= 1) buckets['1']++;
      else if (len <= 3) buckets['2-3']++;
      else if (len <= 5) buckets['4-5']++;
      else if (len <= 8) buckets['6-8']++;
      else if (len <= 12) buckets['9-12']++;
      else buckets['13+']++;
    }

    console.log('\n=== Quality Metrics ===');
    console.log(`4-cons clusters: ${fourConsCount} (${(fourConsCount / gateWords.length * 100).toFixed(2)}%)`);
    console.log(`dk: ${dkCount}`);
    console.log(`ckt: ${cktCount}`);
    console.log(`-owngs: ${owngsCount}`);
    console.log(`-reng/-teng: ${rengTengCount}`);
    console.log(`Avg length: ${avgLength}`);
    console.log(`Unique rate: ${uniqueRate}%`);
    console.log(`Length distribution:`, buckets);

    // Gate results
    const fiveConsCount = gateWords.filter(w => longestConsonantRun(w) >= 5).length;
    const ngxCount = gateWords.filter(w => w.includes('ngx')).length;
    const bkCount = gateWords.filter(w => w.includes('bk')).length;
    const pkCount = gateWords.filter(w => w.includes('pk')).length;

    // Build common words section from trial results
    const milestoneData: Record<string, { median: number | null; values: (number | null)[] }> = {};
    for (const m of MILESTONES) {
      const values = trialResults.map(t => t[m]);
      milestoneData[String(m)] = { median: median(values), values };
    }

    const fullReport = {
      commonWords: {
        trials: TRIALS,
        maxIterations: MAX_ITERATIONS,
        milestones: milestoneData,
      },
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
        lengthDistribution: buckets,
      },
    };

    // Write report
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const reportPath = join(__dirname, '../../quality-report.json');
    writeFileSync(reportPath, JSON.stringify(fullReport, null, 2) + '\n');
    console.log(`\nReport written to ${reportPath}`);

    Object.assign(report, fullReport);
  });
});

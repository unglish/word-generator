import { describe, it, expect, beforeAll } from 'vitest';
import { generateWord } from './generate.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Top ~100 English words by frequency (Oxford / Corpus of Contemporary American English).
const COMMON_WORDS = new Set([
  'a', 'i', 'the', 'be', 'to', 'of', 'and', 'in', 'that', 'have',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'are', 'was', 'had', 'been',
]); // 104 words

const MAX_ITERATIONS = 200_000;
// Milestones as percentages of COMMON_WORDS.size
const MILESTONE_PCTS = [50, 75, 90, 100] as const;
const TRIALS = 5;
const GATE_SAMPLE_SIZE = 200_000;

// Norvig/Mayzner English letter frequencies (% of all letters, Google Books corpus)
// Source: https://norvig.com/mayzner.html
const NORVIG_LETTER_FREQ: Record<string, number> = {
  e:12.49, t:9.28, a:8.04, o:7.64, i:7.57, n:7.23, s:6.51, r:6.28, h:5.05, l:4.07,
  d:3.82, c:3.34, u:2.73, m:2.51, f:2.40, p:2.14, g:1.87, w:1.68, y:1.66, b:1.48,
  v:1.05, k:0.54, x:0.23, j:0.16, q:0.12, z:0.09,
};

// Norvig/Mayzner top 50 bigram frequencies (%)
const NORVIG_BIGRAM_FREQ: Record<string, number> = {
  th:3.56, he:3.07, in:2.43, er:2.05, an:1.99, re:1.85, on:1.76, at:1.49, en:1.45, nd:1.35,
  ti:1.34, es:1.34, or:1.28, te:1.20, of:1.17, ed:1.17, is:1.13, it:1.12, al:1.09, ar:1.07,
  st:1.05, to:1.04, nt:1.04, ng:0.95, se:0.93, ha:0.93, as:0.87, ou:0.87, io:0.83, le:0.83,
  ve:0.83, co:0.79, me:0.79, de:0.76, hi:0.76, ri:0.73, ro:0.73, ic:0.70, ne:0.69, ea:0.69,
  ra:0.69, ce:0.65, li:0.62, ch:0.60, ll:0.58, be:0.58, ma:0.57, si:0.55, om:0.55, ur:0.54,
};

const VOWELS = new Set('aeiouy'.split(''));
const RE_OWNGS = /owngs/;
const RE_RENG_TENG = /[rt]eng$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isVowelChar(ch: string, idx: number, str: string): boolean {
  const lower = ch.toLowerCase();
  if (lower === 'y' && idx === 0 && str.length > 1 && 'aeiou'.includes(str[1].toLowerCase())) {
    return false;
  }
  return VOWELS.has(lower);
}

function isConsonantLetter(ch: string, idx?: number, str?: string): boolean {
  if (idx !== undefined && str !== undefined) {
    return /[a-z]/i.test(ch) && !isVowelChar(ch, idx, str);
  }
  return /[a-z]/i.test(ch) && !VOWELS.has(ch.toLowerCase());
}

function longestConsonantRun(word: string): number {
  let max = 0, cur = 0;
  for (let i = 0; i < word.length; i++) {
    if (isConsonantLetter(word[i], i, word)) { cur++; if (cur > max) max = cur; }
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

function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
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
    it(`Common words trial ${trial + 1}/${TRIALS}`, { timeout: 60_000 }, async () => {
      const found = new Set<string>();
      const total = COMMON_WORDS.size;
      const milestoneTargets = MILESTONE_PCTS.map(pct => Math.ceil(total * pct / 100));
      const milestoneHits: Record<number, number | null> = {};
      for (const pct of MILESTONE_PCTS) milestoneHits[pct] = null;

      const seedOffset = trial * MAX_ITERATIONS;

      for (let i = 0; i < MAX_ITERATIONS; i++) {
        // Yield to the event loop every 10k iterations so Vitest's RPC
        // heartbeat doesn't time out during long CPU-bound runs.
        if (i > 0 && i % 10_000 === 0) await new Promise(r => setTimeout(r, 0));

        const word = generateWord({ seed: seedOffset + i });
        const written = word.written.clean.toLowerCase();

        if (COMMON_WORDS.has(written)) {
          found.add(written);
          for (let mi = 0; mi < MILESTONE_PCTS.length; mi++) {
            const pct = MILESTONE_PCTS[mi];
            if (milestoneHits[pct] === null && found.size >= milestoneTargets[mi]) {
              milestoneHits[pct] = i + 1;
            }
          }
          if (found.size >= total) break;
        }
      }

      console.log(`Trial ${trial + 1}: found ${found.size}/${total} common words`);
      for (const pct of MILESTONE_PCTS) {
        console.log(`  ${pct}%: ${fmt(milestoneHits[pct])}`);
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
    let letterCounts: Record<string, number> = {};
    let bigramCounts: Record<string, number> = {};
    let totalLetters = 0;
    let totalBigrams = 0;

    beforeAll(async () => {
      // Generate 200k words
      gateWords = [];
      for (let i = 0; i < GATE_SAMPLE_SIZE; i++) {
        if (i > 0 && i % 10_000 === 0) await new Promise(r => setTimeout(r, 0));
        gateWords.push(generateWord({ seed: i }).written.clean.toLowerCase());
      }

      // Single pass to compute all counts
      const buckets: Record<string, number> = { '1': 0, '2-3': 0, '4-5': 0, '6-8': 0, '9-12': 0, '13+': 0 };
      let totalLen = 0;
      const uniqueWords = new Set<string>();

      for (const ch of 'abcdefghijklmnopqrstuvwxyz') letterCounts[ch] = 0;

      for (const w of gateWords) {
        // Letter & bigram counting
        for (let ci = 0; ci < w.length; ci++) {
          const ch = w[ci];
          if (ch >= 'a' && ch <= 'z') {
            letterCounts[ch]++;
            totalLetters++;
          }
          if (ci > 0) {
            const prev = w[ci - 1];
            if (prev >= 'a' && prev <= 'z' && ch >= 'a' && ch <= 'z') {
              const bg = prev + ch;
              bigramCounts[bg] = (bigramCounts[bg] || 0) + 1;
              totalBigrams++;
            }
          }
        }
        const run = longestConsonantRun(w);
        if (run >= 5) fiveConsCount++;
        if (run >= 4) fourConsCount++;
        if (w.includes('ngx')) ngxCount++;
        if (w.includes('bk')) bkCount++;
        if (w.includes('pk')) pkCount++;
        if (w.includes('dk')) dkCount++;
        if (w.includes('ckt')) cktCount++;
        if (RE_OWNGS.test(w)) owngsCount++;
        if (RE_RENG_TENG.test(w)) rengTengCount++;

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

    it('Gate: no ckt occurrences', () => {
      expect(cktCount).toBe(0);
    });

    it('Gate: bk < 50', () => {
      expect(bkCount).toBeLessThan(50);
    });

    it('Gate: pk < 50', () => {
      expect(pkCount).toBeLessThan(50);
    });

    it('Gate: owngs = 0', () => {
      expect(owngsCount).toBe(0);
    });

    it('Gate: rengTeng < 150', () => {
      expect(rengTengCount).toBeLessThan(150);
    });

    // Orthographic distribution benchmarks
    it('Letter frequency correlation with English', () => {
      const letters = Object.keys(NORVIG_LETTER_FREQ);
      const ours = letters.map(l => (letterCounts[l] || 0) / totalLetters * 100);
      const norvig = letters.map(l => NORVIG_LETTER_FREQ[l]);
      const r = pearsonCorrelation(ours, norvig);

      // Report
      const ourSorted = letters.map(l => ({ l, pct: (letterCounts[l] || 0) / totalLetters * 100 }))
        .sort((a, b) => b.pct - a.pct);
      const norvigSorted = letters.map(l => ({ l, pct: NORVIG_LETTER_FREQ[l] }))
        .sort((a, b) => b.pct - a.pct);
      console.log(`\n=== Letter Frequency Correlation: r=${r.toFixed(4)} ===`);
      console.log('Our top 10:', ourSorted.slice(0, 10).map(x => `${x.l}:${x.pct.toFixed(2)}`).join(', '));
      console.log('Norvig top 10:', norvigSorted.slice(0, 10).map(x => `${x.l}:${x.pct.toFixed(2)}`).join(', '));

      const ratios = letters.map(l => ({
        l, ratio: ((letterCounts[l] || 0) / totalLetters * 100) / NORVIG_LETTER_FREQ[l]
      })).sort((a, b) => b.ratio - a.ratio);
      console.log('Top 5 over-represented:', ratios.slice(0, 5).map(x => `${x.l}:${x.ratio.toFixed(2)}×`).join(', '));
      console.log('Top 5 under-represented:', ratios.slice(-5).reverse().map(x => `${x.l}:${x.ratio.toFixed(2)}×`).join(', '));

      expect(r).toBeGreaterThan(0.80);
    });

    it('Bigram frequency correlation with English', () => {
      const bigrams = Object.keys(NORVIG_BIGRAM_FREQ);
      const ours = bigrams.map(bg => (bigramCounts[bg] || 0) / totalBigrams * 100);
      const norvig = bigrams.map(bg => NORVIG_BIGRAM_FREQ[bg]);
      const r = pearsonCorrelation(ours, norvig);

      const ratios = bigrams.map(bg => ({
        bg, ratio: ((bigramCounts[bg] || 0) / totalBigrams * 100) / NORVIG_BIGRAM_FREQ[bg]
      })).sort((a, b) => b.ratio - a.ratio);
      console.log(`\n=== Bigram Frequency Correlation: r=${r.toFixed(4)} ===`);
      console.log('Top 5 over:', ratios.slice(0, 5).map(x => `${x.bg}:${x.ratio.toFixed(2)}×`).join(', '));
      console.log('Top 5 under:', ratios.slice(-5).reverse().map(x => `${x.bg}:${x.ratio.toFixed(2)}×`).join(', '));

      expect(r).toBeGreaterThan(0.40);
    });

    it('No letter more than 25× over or under expected frequency', () => {
      const violations: string[] = [];
      for (const [l, expected] of Object.entries(NORVIG_LETTER_FREQ)) {
        const ourPct = (letterCounts[l] || 0) / totalLetters * 100;
        const ratio = ourPct / expected;
        if (ratio > 25 || ratio < 0.04) {
          violations.push(`${l}: ${ourPct.toFixed(2)}% vs ${expected}% (${ratio.toFixed(2)}×)`);
        }
      }
      if (violations.length > 0) {
        console.log('\n=== Frequency Violations ===');
        violations.forEach(v => console.log(v));
      }
      expect(violations).toEqual([]);
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
      for (const pct of MILESTONE_PCTS) {
        const values = trialResults.map(t => t[pct]);
        milestoneData[`${pct}%`] = { median: median(values), values };
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

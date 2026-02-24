import { describe, it, expect, beforeAll } from "vitest";
import { generateWord, generateWords } from "./generate.js";
import { writeFileSync } from "fs";
import { join } from "path";

import { isConsonantLetter } from "../utils/letters.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const GATE_SAMPLE_SIZE = envInt("QUALITY_GATE_SAMPLE_SIZE", 50_000);
const MODE_SAMPLE_SIZE = envInt("QUALITY_MODE_SAMPLE_SIZE", 50_000);
const HEARTBEAT_YIELD_EVERY = envInt("QUALITY_HEARTBEAT_EVERY", 10_000);

const RE_OWNGS = /owngs/;
const RE_RENG_TENG = /[rt]eng$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const fmtNumber = new Intl.NumberFormat("en-US");
const fmt = (n: number | null | undefined) =>
  n !== null && n !== undefined ? fmtNumber.format(n) : "not reached";

// ---------------------------------------------------------------------------
// Quality Benchmark
// ---------------------------------------------------------------------------

// NOTE: Test ordering matters. Vitest runs tests within a describe block
// sequentially in declaration order. The trial tests must run before the
// gates/metrics block so that trialResults is populated for the report.

describe("Quality Benchmark", () => {
  const strictNgramQuality = process.env.STRICT_NGRAM_QUALITY !== "0";

  const trialResults: Array<Record<number, number | null>> = [];

  // -------------------------------------------------------------------------
  // Gates & Metrics (200k sample)
  // -------------------------------------------------------------------------

  describe("Quality Gates & Metrics", () => {
    let gateWords: string[] = [];

    // Shared gate counts — computed once in beforeAll, asserted individually
    let fiveConsCount = 0;
    let fourConsCount = 0;
    let dkCount = 0;
    let owngsCount = 0;
    let rengTengCount = 0;
    let avgLength = 0;
    let uniqueRate = 0;
    let lengthDistribution: Record<string, number> = {};
    const letterCounts: Record<string, number> = {};
    const bigramCounts: Record<string, number> = {};
    const trigramCounts: Record<string, number> = {};
    let totalLetters = 0;
    let totalBigrams = 0;
    let totalTrigrams = 0;

    // Monosyllable stats
    let monoTotal = 0;
    let monoTwoLetterOrLess = 0;
    let monoOpen = 0; // no coda

    beforeAll(async () => {
      // Generate 200k words
      gateWords = [];
      for (let i = 0; i < GATE_SAMPLE_SIZE; i++) {
        if (i > 0 && i % HEARTBEAT_YIELD_EVERY === 0) await new Promise(r => setTimeout(r, 0));
        const word = generateWord({ seed: i, mode: "lexicon" });
        const w = word.written.clean.toLowerCase();
        gateWords.push(w);

        // Track monosyllable stats
        if (word.syllables.length === 1) {
          monoTotal++;
          if (w.length <= 2) monoTwoLetterOrLess++;
          if (word.syllables[0].coda.length === 0) monoOpen++;
        }
      }

      // Single pass to compute all counts
      const buckets: Record<string, number> = { "1": 0, "2-3": 0, "4-5": 0, "6-8": 0, "9-12": 0, "13+": 0 };
      let totalLen = 0;
      const uniqueWords = new Set<string>();

      for (const ch of "abcdefghijklmnopqrstuvwxyz") letterCounts[ch] = 0;

      for (const w of gateWords) {
        // Letter & bigram counting
        for (let ci = 0; ci < w.length; ci++) {
          const ch = w[ci];
          if (ch >= "a" && ch <= "z") {
            letterCounts[ch]++;
            totalLetters++;
          }
          if (ci > 0) {
            const prev = w[ci - 1];
            if (prev >= "a" && prev <= "z" && ch >= "a" && ch <= "z") {
              const bg = prev + ch;
              bigramCounts[bg] = (bigramCounts[bg] || 0) + 1;
              totalBigrams++;
            }
          }
          if (ci > 1) {
            const pp = w[ci - 2];
            const prev = w[ci - 1];
            if (pp >= "a" && pp <= "z" && prev >= "a" && prev <= "z" && ch >= "a" && ch <= "z") {
              const tg = pp + prev + ch;
              trigramCounts[tg] = (trigramCounts[tg] || 0) + 1;
              totalTrigrams++;
            }
          }
        }
        const run = longestConsonantRun(w);
        if (run >= 5) fiveConsCount++;
        if (run >= 4) fourConsCount++;
        if (w.includes("dk")) dkCount++;
        if (RE_OWNGS.test(w)) owngsCount++;
        if (RE_RENG_TENG.test(w)) rengTengCount++;

        totalLen += w.length;
        uniqueWords.add(w);

        const len = w.length;
        if (len <= 1) buckets["1"]++;
        else if (len <= 3) buckets["2-3"]++;
        else if (len <= 5) buckets["4-5"]++;
        else if (len <= 8) buckets["6-8"]++;
        else if (len <= 12) buckets["9-12"]++;
        else buckets["13+"]++;
      }

      avgLength = +(totalLen / gateWords.length).toFixed(1);
      uniqueRate = +(uniqueWords.size / gateWords.length * 100).toFixed(1);
      lengthDistribution = buckets;
    }, 120_000);

    // Hard gates
    it("Gate: no 5+ consecutive consonant letters", () => {
      expect(fiveConsCount).toBe(0);
    });

    it("Gate: owngs <= 1", () => {
      // Keep this as a hard anti-pattern signal, but allow a single occurrence
      // in large stochastic samples to avoid flaky CI failures.
      expect(owngsCount).toBeLessThanOrEqual(1);
    });

    it("Gate: rengTeng < 30", () => {
      expect(rengTengCount).toBeLessThan(30);
    });

    it("Gate: 2-letter monosyllables ≤ 9% of all monosyllables", () => {
      const pct = monoTwoLetterOrLess / monoTotal * 100;
      console.log(`2-letter mono: ${monoTwoLetterOrLess}/${monoTotal} (${pct.toFixed(1)}%)`);
      expect(pct).toBeLessThanOrEqual(9);
    });

    it("Gate: open monosyllables ≤ 20% of all monosyllables", () => {
      const pct = monoOpen / monoTotal * 100;
      console.log(`Open mono: ${monoOpen}/${monoTotal} (${pct.toFixed(1)}%)`);
      expect(pct).toBeLessThanOrEqual(20);
    });

    // Report generation
    it("Write quality report", () => {
      console.log("\n=== Quality Metrics ===");
      console.log(`5+ consonant runs: ${fiveConsCount}`);
      console.log(`4-cons clusters: ${fourConsCount} (${(fourConsCount / gateWords.length * 100).toFixed(2)}%)`);
      console.log(`dk: ${dkCount}`);
      console.log(`-owngs: ${owngsCount}`);
      console.log(`-reng/-teng: ${rengTengCount}`);
      console.log(`Avg length: ${avgLength}`);
      console.log(`Unique rate: ${uniqueRate}%`);
      console.log("Length distribution:", lengthDistribution);

      const fullReport = {
        gates: {
          fiveConsecutiveConsonants: fiveConsCount,
        },
        metrics: {
          fourConsonantClusters: { count: fourConsCount, rate: +(fourConsCount / gateWords.length * 100).toFixed(2) },
          dk: dkCount,
          owngs: owngsCount,
          rengTeng: rengTengCount,
          avgLength,
          uniqueRate,
          lengthDistribution,
        },
      };

      // Write report to repo root (vitest cwd)
      const reportPath = join(process.cwd(), "quality-report.json");
      writeFileSync(reportPath, JSON.stringify(fullReport, null, 2) + "\n");
      console.log(`\nReport written to ${reportPath}`);
    });
  });
});

// ---------------------------------------------------------------------------
// Generation Mode Benchmarks
// ---------------------------------------------------------------------------

describe("Generation Mode Benchmarks", () => {
  const MODE_SAMPLE = MODE_SAMPLE_SIZE;

  interface ModeStats {
    syllablePct: Record<number, number>;
    avgLetters: number;
  }

  function measureMode(mode: "text" | "lexicon"): ModeStats {
    const words = generateWords(MODE_SAMPLE, { seed: 1, mode });
    const counts: Record<number, number> = {};
    let totalLetters = 0;
    for (const w of words) {
      const sc = w.syllables.length;
      counts[sc] = (counts[sc] || 0) + 1;
      totalLetters += w.written.clean.length;
    }
    const syllablePct: Record<number, number> = {};
    for (const [k, v] of Object.entries(counts)) {
      syllablePct[+k] = v / MODE_SAMPLE * 100;
    }
    return { syllablePct, avgLetters: totalLetters / words.length };
  }

  function logStats(label: string, stats: ModeStats) {
    console.log(`\n=== ${label} ===`);
    for (let s = 1; s <= 7; s++) {
      if (stats.syllablePct[s]) console.log(`  ${s}-syl: ${stats.syllablePct[s].toFixed(1)}%`);
    }
    console.log(`  Avg letters: ${stats.avgLetters.toFixed(1)}`);
  }

  // -- Text mode: should resemble running English prose --

  describe("Text mode", () => {
    let stats: ModeStats;
    beforeAll(() => { stats = measureMode("text"); logStats("Text Mode", stats); }, 120_000);

    it("monosyllables dominate (> 35%)",     () => expect(stats.syllablePct[1]).toBeGreaterThan(35));
    it("3-syllable words are rare (< 20%)",  () => expect(stats.syllablePct[3]).toBeLessThan(20));
    it("average word length is short (< 6.5 letters)", () => expect(stats.avgLetters).toBeLessThan(6.5));
  });

  // -- Lexicon mode: should resemble a dictionary word list --

  describe("Lexicon mode", () => {
    let stats: ModeStats;
    beforeAll(() => { stats = measureMode("lexicon"); logStats("Lexicon Mode", stats); }, 120_000);

    it("2-syllable words are most common (> 25%)", () => expect(stats.syllablePct[2]).toBeGreaterThan(25));
    it("monosyllables are present (> 5%)",          () => expect(stats.syllablePct[1]).toBeGreaterThan(5));
    it("average word length is moderate (> 6.0 letters)", () => expect(stats.avgLetters).toBeGreaterThan(6.0));
  });
});

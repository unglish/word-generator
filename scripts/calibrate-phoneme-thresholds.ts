/**
 * Calibrate phoneme gate limits from multi-seed spread.
 *
 * Runs the exact measurement of `src/core/phoneme-quality.test.ts` (same sample
 * size, mode, normalization and metric code) on many seeds, then proposes limits
 * at the worst observed value widened by k sample standard deviations.
 *
 *   npm run calibrate:phonemes -- [--seeds 42,7,...] [--count 30] [--k 3] [--jobs 8] [--output file.json]
 *
 * Default seeds are 42 plus seeds whose Mulberry32 streams start evenly spaced
 * around the 2^32 cycle, so no two runs share a stretch of the RNG stream. Custom
 * seeds are checked for overlap using the draws each run actually consumed.
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { generateWords } from "../src/core/generate.js";
import { countNormalizedPhonemes, type PhonemeNormalization } from "../src/core/phoneme-normalization.js";
import { computePhonemeQualityMetrics } from "../src/core/phoneme-quality.js";
import { createSeededRng } from "../src/utils/random.js";

const REPO_ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const THRESHOLDS_PATH = join(REPO_ROOT, "src", "config", "phoneme-thresholds.json");
const CYCLE = 2n ** 32n;
const MULBERRY_INCREMENT = 0x6d2b79f5n;

interface Thresholds {
  sampleSize: number;
  seed: number;
  minCommonBaselinePct: number;
  [limit: string]: number | string;
}

interface SeedResult {
  seed: number;
  draws: number;
  normalizationLosses: number;
  sharedPearsonR: number;
  nonCmuMassPct: number;
  maxOverRepresentation: number;
  maxOverPhoneme: string;
  minRepresentation: number;
  minRepPhoneme: string;
  maxAbsoluteGapPct: number;
  maxGapPhoneme: string;
  cmuOnlyKeyCount: number;
}

/** Gate limits, their direction, and the precision they are rounded outward to. */
const LIMITS = [
  { limit: "minSharedPearsonR", metric: "sharedPearsonR", bound: "lower", decimals: 4 },
  { limit: "maxOverRepresentation", metric: "maxOverRepresentation", bound: "upper", decimals: 3 },
  { limit: "minRepresentation", metric: "minRepresentation", bound: "lower", decimals: 3 },
  { limit: "maxAbsoluteGapPct", metric: "maxAbsoluteGapPct", bound: "upper", decimals: 3 },
  { limit: "maxGeneratedOnlyMassPct", metric: "nonCmuMassPct", bound: "upper", decimals: 3 },
  { limit: "maxCmuOnlyKeyCount", metric: "cmuOnlyKeyCount", bound: "upper", decimals: 0 },
] as const;

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function measureSeed(seed: number, thresholds: Thresholds): SeedResult {
  const normalization = loadJson<PhonemeNormalization>(join(REPO_ROOT, "data", "cmu", "phoneme-normalization.json"));
  const baselineCounts = loadJson<Record<string, number>>(join(REPO_ROOT, "data", "cmu", "cmu-lexicon-phonemes.json"));
  const stream = createSeededRng(seed);
  let draws = 0;
  // Identical output to `{ seed }`: generateWords builds the same stream internally.
  const rand = () => {
    draws++;
    return stream();
  };
  const words = generateWords(thresholds.sampleSize, { rand, mode: "lexicon", morphology: false });
  const { counts, losses } = countNormalizedPhonemes(words, normalization);
  const metrics = computePhonemeQualityMetrics(counts, baselineCounts, thresholds.minCommonBaselinePct);
  const [over] = metrics.topOverRepresented;
  const [under] = metrics.topUnderRepresented;
  const [gap] = metrics.topAbsoluteGap;
  return {
    seed,
    draws,
    normalizationLosses: Object.values(losses).reduce((a, b) => a + b, 0),
    sharedPearsonR: metrics.sharedPearsonR,
    nonCmuMassPct: metrics.nonCmuMassPct,
    maxOverRepresentation: over.ratio,
    maxOverPhoneme: over.phoneme,
    minRepresentation: under.ratio,
    minRepPhoneme: under.phoneme,
    maxAbsoluteGapPct: gap.absGapPct,
    maxGapPhoneme: gap.phoneme,
    cmuOnlyKeyCount: metrics.cmuOnlyKeyCount,
  };
}

/** Index of a seed's starting state in the Mulberry32 cycle (state advances by a fixed odd increment). */
function streamPosition(seed: number): bigint {
  const inverse = modInverse(MULBERRY_INCREMENT, CYCLE);
  return (((BigInt(seed) * inverse) % CYCLE) + CYCLE) % CYCLE;
}

function modInverse(a: bigint, m: bigint): bigint {
  let [oldR, r, oldS, s] = [a, m, 1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  return ((oldS % m) + m) % m;
}

/** 42 first, then seeds whose streams start at evenly spaced cycle positions after it. */
function evenlySpacedSeeds(anchor: number, count: number): number[] {
  const step = CYCLE / BigInt(count);
  return Array.from({ length: count }, (_, i) => Number((BigInt(anchor) + BigInt(i) * step * MULBERRY_INCREMENT) % CYCLE));
}

function findOverlaps(results: SeedResult[]): string[] {
  const overlaps: string[] = [];
  for (const a of results) {
    for (const b of results) {
      if (a === b) continue;
      const ahead = (streamPosition(b.seed) - streamPosition(a.seed) + CYCLE) % CYCLE;
      if (ahead < BigInt(a.draws)) overlaps.push(`seed ${b.seed} starts ${ahead} draws into seed ${a.seed}'s run`);
    }
  }
  return overlaps;
}

function runWorker(seed: number): Promise<SeedResult> {
  return new Promise((resolve, reject) => {
    const script = fileURLToPath(import.meta.url);
    const child = spawn(process.execPath, [...process.execArgv, script, "--worker-seed", String(seed)], {
      stdio: ["ignore", "pipe", "inherit"],
    });
    let stdout = "";
    child.stdout.on("data", chunk => (stdout += chunk));
    child.on("error", reject);
    child.on("close", code => {
      if (code !== 0) reject(new Error(`seed ${seed} exited with ${code}`));
      else resolve(JSON.parse(stdout) as SeedResult);
    });
  });
}

async function mapConcurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
      process.stderr.write(`  seed ${items[i]} done (${results.filter(Boolean).length}/${items.length})\n`);
    }
  });
  await Promise.all(lanes);
  return results;
}

function summarize(values: number[]) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1);
  return { min: Math.min(...values), max: Math.max(...values), mean, sd: Math.sqrt(variance) };
}

function roundOutward(value: number, decimals: number, bound: "lower" | "upper"): number {
  const scale = 10 ** decimals;
  const rounded = bound === "upper" ? Math.ceil(value * scale - 1e-9) : Math.floor(value * scale + 1e-9);
  return rounded / scale;
}

function proposeLimits(results: SeedResult[], k: number) {
  return LIMITS.map(({ limit, metric, bound, decimals }) => {
    const stats = summarize(results.map(r => r[metric]));
    const raw = bound === "upper" ? stats.max + k * stats.sd : stats.min - k * stats.sd;
    return { limit, metric, bound, ...stats, proposed: roundOutward(raw, decimals, bound) };
  });
}

function fmt(value: number, decimals = 4): string {
  return value.toFixed(decimals);
}

function printReport(results: SeedResult[], thresholds: Thresholds, k: number) {
  const proposals = proposeLimits(results, k);
  console.log(`\nPer-seed metrics (${thresholds.sampleSize} words, lexicon, morphology off)\n`);
  console.log("| Seed | Draws | Pearson r | Worst over | Worst under | Worst abs gap % | Non-CMU % | CMU-only |");
  console.log("|---:|---:|---:|---|---|---|---:|---:|");
  for (const r of results) {
    console.log(
      `| ${r.seed} | ${r.draws} | ${fmt(r.sharedPearsonR, 5)} | /${r.maxOverPhoneme}/ ${fmt(r.maxOverRepresentation)} | ` +
        `/${r.minRepPhoneme}/ ${fmt(r.minRepresentation)} | /${r.maxGapPhoneme}/ ${fmt(r.maxAbsoluteGapPct)} | ` +
        `${fmt(r.nonCmuMassPct)} | ${r.cmuOnlyKeyCount} |`,
    );
  }
  console.log(`\nSpread and proposed limits (k = ${k}; upper = max + k·SD, lower = min − k·SD, rounded outward)\n`);
  console.log("| Limit | Min | Max | Mean | SD | Current | Proposed |");
  console.log("|---|---:|---:|---:|---:|---:|---:|");
  for (const p of proposals) {
    console.log(
      `| ${p.limit} | ${fmt(p.min, 5)} | ${fmt(p.max, 5)} | ${fmt(p.mean, 5)} | ${fmt(p.sd, 5)} | ${thresholds[p.limit]} | ${p.proposed} |`,
    );
  }
  const losses = results.filter(r => r.normalizationLosses > 0);
  if (losses.length > 0) console.log(`\nWARNING: normalization rejected tokens on seeds ${losses.map(r => r.seed).join(", ")}`);
  return proposals;
}

async function main() {
  const { values } = parseArgs({
    options: {
      seeds: { type: "string" },
      count: { type: "string", default: "30" },
      k: { type: "string", default: "3" },
      jobs: { type: "string", default: String(Math.max(1, cpus().length - 2)) },
      output: { type: "string" },
      "worker-seed": { type: "string" },
    },
  });
  const thresholds = loadJson<Thresholds>(THRESHOLDS_PATH);

  if (values["worker-seed"] !== undefined) {
    process.stdout.write(JSON.stringify(measureSeed(Number(values["worker-seed"]), thresholds)));
    return;
  }

  const seeds = values.seeds
    ? values.seeds.split(",").map(s => Number(s.trim()))
    : evenlySpacedSeeds(thresholds.seed, Number(values.count));
  if (seeds.some(s => !Number.isSafeInteger(s) || s < 0 || s > 0xffffffff) || new Set(seeds).size !== seeds.length) {
    throw new Error("Seeds must be distinct unsigned 32-bit integers.");
  }
  if (seeds.length < 2) throw new Error("Need at least two seeds to measure spread.");
  const k = Number(values.k);

  process.stderr.write(`Measuring ${seeds.length} seeds × ${thresholds.sampleSize} words with ${values.jobs} jobs\n`);
  const results = await mapConcurrent(seeds, Number(values.jobs), runWorker);

  const overlaps = findOverlaps(results);
  if (overlaps.length > 0) throw new Error(`Overlapping RNG streams:\n${overlaps.join("\n")}`);

  const proposals = printReport(results, thresholds, k);
  if (values.output) {
    writeFileSync(values.output, `${JSON.stringify({ sampleSize: thresholds.sampleSize, k, results, proposals }, null, 2)}\n`);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

/**
 * Calibrate phoneme gate limits from multi-seed spread.
 *
 * Runs the exact measurement of `src/core/phoneme-quality.test.ts` (same sample
 * size, mode, normalization and metric code) on many seeds, then proposes limits
 * at the worst observed value widened by k sample standard deviations. Inventory
 * coverage remains fixed at zero; violating runs cannot produce proposals.
 *
 *   npm run calibrate:phonemes -- [--stage roots|fullCmu] [--seeds 42,7,...] [--count 30] [--k 3] [--jobs 8] [--output file.json]
 *
 * Default seeds are 42 plus seeds whose Mulberry32 streams start evenly spaced
 * around the 2^32 cycle, so no two runs share a stretch of the caller's stream
 * and no word key repeats between runs. Each word's stage streams are other
 * windows on the same cycle and can overlap between runs
 * (docs/stage-random-streams.md). Custom seeds are checked for overlap using the
 * draws each run actually consumed.
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import type { generateWord } from "../src/index.js";
import { lengthTotalVariationPct, meanSyllableGap } from "../src/core/stage-quality.js";
import { countNormalizedPhonemes, type PhonemeNormalization } from "../src/core/phoneme-normalization.js";
import { computePhonemeQualityMetrics } from "../src/core/phoneme-quality.js";
import { createSeededRng } from "../src/utils/random.js";
import { proposeLimits, type SeedResult } from "./lib/phoneme-calibration.js";

const REPO_ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const THRESHOLDS_PATH = join(REPO_ROOT, "src", "config", "phoneme-thresholds.json");
type Stage = "roots" | "fullCmu";

const CYCLE = 2n ** 32n;
const MULBERRY_INCREMENT = 0x6d2b79f5n;
/**
 * Each word takes exactly two draws from the caller's stream since #556. A
 * `--generator-root` checkout may predate #556, when a lexicon word took about
 * 86, so the check before the run assumes the old conservative 100 for any
 * other checkout. The check after the run uses the draws each run actually took.
 */
const DRAWS_PER_WORD = 2;
const OTHER_CHECKOUT_DRAWS_PER_WORD = 100;

interface Thresholds {
  sampleSize: number;
  seed: number;
  minCommonBaselinePct: number;
  [limit: string]: number | string;
}

function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

async function measureSeed(seed: number, thresholds: Thresholds, stage: Stage, generatorRoot: string, referencePath: string): Promise<SeedResult> {
  const api: { generateWord: typeof generateWord } = await import(pathToFileURL(join(generatorRoot, "src/index.ts")).href);
  const normalization = loadJson<PhonemeNormalization>(join(REPO_ROOT, "data", "cmu", "phoneme-normalization.json"));
  const reference = loadJson<{
    roots: { phonemes: Record<string, number>; finalCodaLengths: Record<string, number> };
    fullCmu: { phonemes: Record<string, number>; syllables: Record<string, number> };
  }>(
    referencePath,
  );
  const baselineCounts = reference[stage].phonemes;
  const stream = createSeededRng(seed);
  let draws = 0;
  const rand = () => {
    draws++;
    return stream();
  };
  // Same words as the gate's `generateWords(n, { seed })`, which loops over one shared stream;
  // streaming avoids holding every word in memory.
  const syllables: Record<string, number> = {};
  const finalCodaLengths: Record<string, number> = {};
  function* words() {
    for (let i = 0; i < thresholds.sampleSize; i++) {
      const word = api.generateWord({ rand, mode: "lexicon", morphology: stage === "fullCmu" });
      const length = word.syllables.length;
      syllables[length] = (syllables[length] ?? 0) + 1;
      if (stage === "roots") {
        const coda = word.syllables.at(-1)!.coda.length;
        finalCodaLengths[coda] = (finalCodaLengths[coda] ?? 0) + 1;
      }
      yield word;
    }
  }
  const { counts, losses } = countNormalizedPhonemes(words(), normalization);
  const metrics = computePhonemeQualityMetrics(counts, baselineCounts, thresholds.minCommonBaselinePct);
  const [over] = metrics.topOverRepresented;
  const [under] = metrics.topUnderRepresented;
  const [gap] = metrics.topAbsoluteGap;
  return {
    seed,
    draws,
    normalizationLosses: Object.values(losses).reduce((a, b) => a + b, 0),
    sharedPearsonR: metrics.sharedPearsonR,
    totalVariationPct: metrics.totalVariationPct,
    nonCmuMassPct: metrics.nonCmuMassPct,
    maxOverRepresentation: over.ratio,
    maxOverPhoneme: over.phoneme,
    minRepresentation: under.ratio,
    minRepPhoneme: under.phoneme,
    maxAbsoluteGapPct: gap.absGapPct,
    maxGapPhoneme: gap.phoneme,
    cmuOnlyKeyCount: metrics.cmuOnlyKeyCount,
    phonemes: metrics.topOverRepresented,
    counts,
    syllables,
    ...stage === "roots"
      ? { finalCodaLengths, rootFinalCodaTV: lengthTotalVariationPct(finalCodaLengths, reference.roots.finalCodaLengths) }
      : { finishedSyllableTV: lengthTotalVariationPct(syllables, reference.fullCmu.syllables),
          finishedMeanSyllableGap: meanSyllableGap(syllables, reference.fullCmu.syllables) },
  };
}

/** Index of a seed's starting state in the Mulberry32 cycle (state advances by a fixed odd increment). */
function streamPosition(seed: number): bigint {
  return (((BigInt(seed) * INCREMENT_INVERSE) % CYCLE) + CYCLE) % CYCLE;
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

const INCREMENT_INVERSE = modInverse(MULBERRY_INCREMENT, CYCLE);

/** 42 first, then seeds whose streams start at evenly spaced cycle positions after it. */
function evenlySpacedSeeds(anchor: number, count: number): number[] {
  const step = CYCLE / BigInt(count);
  return Array.from({ length: count }, (_, i) => Number((BigInt(anchor) + BigInt(i) * step * MULBERRY_INCREMENT) % CYCLE));
}

function findOverlaps(runs: Array<Pick<SeedResult, "seed" | "draws">>): string[] {
  const overlaps: string[] = [];
  for (const a of runs) {
    for (const b of runs) {
      if (a === b) continue;
      const ahead = (streamPosition(b.seed) - streamPosition(a.seed) + CYCLE) % CYCLE;
      if (ahead < BigInt(a.draws)) overlaps.push(`seed ${b.seed} starts ${ahead} draws into seed ${a.seed}'s run`);
    }
  }
  return overlaps;
}

function runWorker(seed: number, stage: Stage, generatorRoot: string, referencePath: string): Promise<SeedResult> {
  return new Promise((resolve, reject) => {
    const script = fileURLToPath(import.meta.url);
    const child = spawn(process.execPath, [...process.execArgv, script, "--worker-seed", String(seed), "--stage", stage, "--generator-root", generatorRoot, "--reference", referencePath], {
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

function fmt(value: number, decimals = 4): string {
  return value.toFixed(decimals);
}

function printReport(results: SeedResult[], thresholds: Thresholds, k: number, stage: Stage) {
  const proposals = proposeLimits(results, k);
  console.log(`\nPer-seed metrics (${thresholds.sampleSize} words, lexicon, ${stage})\n`);
  console.log("| Seed | Draws | Total variation % | Pearson r (report-only) | Worst over | Worst under | Worst abs gap % | Non-CMU % | CMU-only |");
  console.log("|---:|---:|---:|---:|---|---|---|---:|---:|");
  for (const r of results) {
    console.log(
      `| ${r.seed} | ${r.draws} | ${fmt(r.totalVariationPct)} | ${fmt(r.sharedPearsonR, 5)} | /${r.maxOverPhoneme}/ ${fmt(r.maxOverRepresentation)} | ` +
        `/${r.minRepPhoneme}/ ${fmt(r.minRepresentation)} | /${r.maxGapPhoneme}/ ${fmt(r.maxAbsoluteGapPct)} | ` +
        `${fmt(r.nonCmuMassPct)} | ${r.cmuOnlyKeyCount} |`,
    );
  }
  console.log(`\nSpread and proposed limits (k = ${k}; upper = max + k·SD, lower = min − k·SD, rounded outward; inventory coverage fixed at 0)\n`);
  console.log("| Limit | Min | Max | Mean | SD | Current | Proposed |");
  console.log("|---|---:|---:|---:|---:|---:|---:|");
  for (const p of proposals) {
    console.log(
      `| ${p.limit} | ${fmt(p.min, 5)} | ${fmt(p.max, 5)} | ${fmt(p.mean, 5)} | ${fmt(p.sd, 5)} | ${thresholds[p.limit]} | ${p.proposed} |`,
    );
  }
  return proposals;
}

function parseSeeds(input: string): number[] {
  const tokens = input.split(",").map(token => token.trim());
  const seeds = tokens.map(Number);
  if (tokens.some(token => !token) || seeds.some(s => !Number.isSafeInteger(s) || s < 0 || s > 0xffffffff)) {
    throw new Error("Seeds must be unsigned 32-bit integers.");
  }
  if (new Set(seeds).size !== seeds.length) throw new Error("Seeds must be distinct.");
  return seeds;
}

function parseCount(flag: string, input: string | undefined): number {
  const value = Number(input);
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${flag} must be a positive integer.`);
  return value;
}

async function main() {
  const { values } = parseArgs({
    options: {
      stage: { type: "string", default: "roots" },
      "generator-root": { type: "string", default: REPO_ROOT },
      reference: { type: "string", default: join(REPO_ROOT, "evaluation", "corpus", "stage-references.json") },
      seeds: { type: "string" },
      count: { type: "string", default: "30" },
      k: { type: "string", default: "3" },
      jobs: { type: "string", default: String(Math.max(1, cpus().length - 2)) },
      output: { type: "string" },
      "worker-seed": { type: "string" },
    },
  });
  const stage = values.stage;
  const generatorRoot = resolve(values["generator-root"] ?? REPO_ROOT);
  const referencePath = resolve(values.reference ?? join(REPO_ROOT, "evaluation", "corpus", "stage-references.json"));
  if (stage !== "roots" && stage !== "fullCmu") throw new Error("--stage must be roots or fullCmu.");
  const limits = loadJson<{ sampleSize: number; seed: number; minCommonBaselinePct: number } &
    Record<Stage, Record<string, number>>>(THRESHOLDS_PATH);
  const thresholds = { ...limits[stage], sampleSize: limits.sampleSize, seed: limits.seed,
    minCommonBaselinePct: limits.minCommonBaselinePct, maxGeneratedOnlyMassPct: 0, maxCmuOnlyKeyCount: 0 };

  if (values["worker-seed"] !== undefined) {
    process.stdout.write(JSON.stringify(await measureSeed(Number(values["worker-seed"]), thresholds, stage, generatorRoot, referencePath)));
    return;
  }

  const seeds = values.seeds ? parseSeeds(values.seeds) : evenlySpacedSeeds(thresholds.seed, parseCount("--count", values.count));
  if (seeds.length < 2) throw new Error("Need at least two seeds to measure spread.");
  const jobs = parseCount("--jobs", values.jobs);
  const k = Number(values.k);
  if (!Number.isFinite(k) || k < 0) throw new Error("--k must be a non-negative number.");

  const drawsPerWord = generatorRoot === resolve(REPO_ROOT) ? DRAWS_PER_WORD : OTHER_CHECKOUT_DRAWS_PER_WORD;
  const estimatedDraws = thresholds.sampleSize * drawsPerWord;
  const likelyOverlaps = findOverlaps(seeds.map(seed => ({ seed, draws: estimatedDraws })));
  if (likelyOverlaps.length > 0) {
    throw new Error(`RNG streams would likely overlap (assuming ${estimatedDraws} draws per run):\n${likelyOverlaps.join("\n")}`);
  }

  process.stderr.write(`Measuring ${seeds.length} seeds × ${thresholds.sampleSize} words with ${jobs} jobs\n`);
  const results = await mapConcurrent(seeds, jobs, seed => runWorker(seed, stage, generatorRoot, referencePath));

  const overlaps = findOverlaps(results);
  if (overlaps.length > 0) throw new Error(`Overlapping RNG streams:\n${overlaps.join("\n")}`);

  const proposals = printReport(results, thresholds, k, stage);
  if (values.output) {
    writeFileSync(values.output, `${JSON.stringify({ stage, sampleSize: thresholds.sampleSize, k, results, proposals }, null, 2)}\n`);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

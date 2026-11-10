/**
 * One timing sample for `scripts/perf-compare.mjs`.
 *
 * Imports the public API from the checkout given as the first argument, warms
 * it up, and prints the fastest of several identical timed passes as JSON.
 * Each sample runs in a fresh process so base and head never share a JIT or
 * heap.
 *
 * Usage: node --import tsx scripts/perf-sample.ts <checkout-dir> <words> <passes>
 */
import path from "node:path";
import { pathToFileURL } from "node:url";

// Fixed seeds, so both checkouts generate from the same RNG streams. Several
// seeds keep one stream's quirks from dominating the sample.
const SEEDS = [42, 1_001, 2_002, 3_003, 4_004];
const WARMUP_WORDS = 500;

type GenerateWords = (count: number, options: { seed: number }) => unknown;

async function loadGenerateWords(checkoutDir: string): Promise<GenerateWords> {
  const entry = pathToFileURL(path.resolve(checkoutDir, "src/index.ts")).href;
  const api = (await import(entry)) as { generateWords: GenerateWords };
  return api.generateWords;
}

function timePass(generateWords: GenerateWords, wordsPerSeed: number): number {
  const start = performance.now();
  for (const seed of SEEDS) generateWords(wordsPerSeed, { seed });
  return performance.now() - start;
}

const [checkoutDir, wordsArg = "5000", passesArg = "3"] = process.argv.slice(2);
if (!checkoutDir) {
  console.error("usage: perf-sample.ts <checkout-dir> [words] [passes]");
  process.exit(2);
}

const words = Number(wordsArg);
const passes = Number(passesArg);
const wordsPerSeed = Math.ceil(words / SEEDS.length);
const generateWords = await loadGenerateWords(checkoutDir);

generateWords(WARMUP_WORDS, { seed: 0 });
const times = Array.from({ length: passes }, () => timePass(generateWords, wordsPerSeed));
const ms = Math.min(...times);

console.log(JSON.stringify({ ms, words: wordsPerSeed * SEEDS.length }));

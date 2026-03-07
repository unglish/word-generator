/**
 * Manual phoneme-length acceptance check for #223.
 *
 * Uses the committed top-down lexicon targets in config rather than requiring
 * a local raw CMU dictionary drop. This is part of normal verification.
 *
 * Usage:
 *   npx tsx scripts/phoneme-length-dist.ts
 *   npx tsx scripts/phoneme-length-dist.ts --sample 50000 --seed 2026
 */
import { generateWords } from "../src/core/generate.js";
import { englishConfig } from "../src/config/english.js";

const DEFAULT_SAMPLE = 200_000;
const DEFAULT_SEED = 42;
const MAX_BUCKET_GAP_PCT = 1.0;
const SIX_BUCKET_GAP_PCT = 1.5;

type Row = {
  phonemes: number;
  generatedPct: number;
  targetPct: number;
  deltaPct: number;
  absGapPct: number;
};

function getArg(name: string, fallback: number): number {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  const value = Number(process.argv[idx + 1]);
  return Number.isFinite(value) ? value : fallback;
}

function countPhonemes(word: ReturnType<typeof generateWords>[number]): number {
  let total = 0;
  for (const syllable of word.syllables) {
    total += syllable.onset.length + syllable.nucleus.length + syllable.coda.length;
  }
  return total;
}

const sampleSize = getArg("sample", DEFAULT_SAMPLE);
const seed = getArg("seed", DEFAULT_SEED);
const targetWeights = englishConfig.phonemeLengthWeights.lexicon;

const words = generateWords(sampleSize, {
  seed,
  mode: "lexicon",
  morphology: false,
});

const generatedCounts = new Map<number, number>();
for (const word of words) {
  const phonemeCount = countPhonemes(word);
  generatedCounts.set(phonemeCount, (generatedCounts.get(phonemeCount) ?? 0) + 1);
}

const rows: Row[] = targetWeights.map(([phonemes, targetPct]) => {
  const generatedPct = ((generatedCounts.get(phonemes) ?? 0) / sampleSize) * 100;
  const deltaPct = generatedPct - targetPct;
  return {
    phonemes,
    generatedPct,
    targetPct,
    deltaPct,
    absGapPct: Math.abs(deltaPct),
  };
});

const worstBucket = rows.reduce((worst, row) =>
  row.absGapPct > worst.absGapPct ? row : worst
);
const sixBucket = rows.find(row => row.phonemes === 6);

console.log("phonemes | generated% | target%   | delta");
console.log("---------|------------|-----------|------");
for (const row of rows.filter(row => row.phonemes <= 16)) {
  console.log(
    `${String(row.phonemes).padEnd(8)} | ${row.generatedPct.toFixed(2).padEnd(10)} | ${row.targetPct.toFixed(2).padEnd(9)} | ${row.deltaPct >= 0 ? "+" : ""}${row.deltaPct.toFixed(2)}`
  );
}

console.log("");
console.log(`Generated: ${sampleSize.toLocaleString()} words (seed ${seed}, mode=lexicon, morphology=false)`);
console.log(`Worst bucket: ${worstBucket.phonemes} phonemes at ${worstBucket.absGapPct.toFixed(3)}pp`);
if (sixBucket) {
  console.log(`6-phoneme bucket: ${sixBucket.generatedPct.toFixed(2)}% vs ${sixBucket.targetPct.toFixed(2)}% (${sixBucket.deltaPct >= 0 ? "+" : ""}${sixBucket.deltaPct.toFixed(2)}pp)`);
}
console.log(`Thresholds: all buckets <= ${MAX_BUCKET_GAP_PCT.toFixed(1)}pp; 6-phoneme bucket <= ${SIX_BUCKET_GAP_PCT.toFixed(1)}pp`);

const failedBuckets = rows.filter(row => row.absGapPct > MAX_BUCKET_GAP_PCT);
const sixBucketFailed = sixBucket ? sixBucket.absGapPct > SIX_BUCKET_GAP_PCT : false;

if (failedBuckets.length > 0 || sixBucketFailed) {
  console.error("");
  console.error("Phoneme-length acceptance FAILED.");
  if (failedBuckets.length > 0) {
    console.error(
      `Buckets above ${MAX_BUCKET_GAP_PCT.toFixed(1)}pp: ${failedBuckets
        .map(row => `${row.phonemes}(${row.absGapPct.toFixed(2)}pp)`)
        .join(", ")}`
    );
  }
  if (sixBucketFailed && sixBucket) {
    console.error(`6-phoneme bucket exceeded ${SIX_BUCKET_GAP_PCT.toFixed(1)}pp: ${sixBucket.absGapPct.toFixed(2)}pp`);
  }
  process.exitCode = 1;
} else {
  console.log("Phoneme-length acceptance PASSED.");
}

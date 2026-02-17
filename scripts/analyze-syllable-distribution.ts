/**
 * Analyze syllable count distribution: CMU dictionary vs generated (lexicon mode).
 * Uses pre-computed baseline from data/cmu-length-baseline.json.
 *
 * Usage: npx tsx scripts/analyze-syllable-distribution.ts [--sample N]
 */
import { generateWord } from "../src/core/generate.js";
import { readFileSync } from "fs";

const SAMPLE = Number(process.argv.find((_, i, a) => a[i - 1] === "--sample") ?? 200000);

// --- Load pre-computed CMU baseline ---
const baseline = JSON.parse(readFileSync("data/cmu-length-baseline.json", "utf8"));
const cmuSylCounts: Record<number, number> = baseline.bySyl;
const cmuTotal: number = baseline.total;

// --- Generated words ---
const genSylCounts: Record<number, number> = {};
const genLenBySyl: Record<number, number[]> = {};

for (let i = 0; i < SAMPLE; i++) {
  const w = generateWord({ seed: i, mode: "lexicon" });
  const sylCount = w.syllables.length;
  const len = w.written.clean.length;
  genSylCounts[sylCount] = (genSylCounts[sylCount] || 0) + 1;
  if (!genLenBySyl[sylCount]) genLenBySyl[sylCount] = [];
  genLenBySyl[sylCount].push(len);
}

// --- Output ---
const maxSyl = Math.max(
  ...Object.keys(cmuSylCounts).map(Number),
  ...Object.keys(genSylCounts).map(Number)
);

console.log("=== Syllable Count Distribution ===\n");
console.log("Syl | CMU%     | Gen%     | Ratio  | CMU count | Gen count");
console.log("----|----------|----------|--------|-----------|----------");
for (let s = 1; s <= maxSyl; s++) {
  const cmuN = cmuSylCounts[s] || 0;
  const genN = genSylCounts[s] || 0;
  const cmuPct = (cmuN / cmuTotal) * 100;
  const genPct = (genN / SAMPLE) * 100;
  const ratio = cmuPct > 0 ? (genPct / cmuPct).toFixed(2) : "N/A";
  console.log(
    `${String(s).padStart(3)} | ${cmuPct.toFixed(2).padStart(6)}%  | ${genPct.toFixed(2).padStart(6)}%  | ${String(ratio).padStart(6)} | ${String(cmuN).padStart(9)} | ${String(genN).padStart(9)}`
  );
}

// --- Per-syllable letter length stats ---
function stats(arr: number[]) {
  if (arr.length === 0) return { mean: 0, median: 0, p10: 0, p90: 0, min: 0, max: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p10 = sorted[Math.floor(sorted.length * 0.1)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  return { mean, median, p10, p90, min: sorted[0], max: sorted[sorted.length - 1] };
}

console.log("\n=== Letter Length by Syllable Count ===\n");
console.log("Syl | Source | Mean  | Median | P10 | P90 | Min | Max");
console.log("----|--------|-------|--------|-----|-----|-----|----");
for (let s = 1; s <= Math.min(maxSyl, 7); s++) {
  const cmuSyl = baseline.bySylLen[s];
  if (cmuSyl) {
    const cs = cmuSyl.stats;
    console.log(
      `${String(s).padStart(3)} | CMU    | ${cs.mean.toFixed(1).padStart(5)} | ${String(cs.median).padStart(6)} | ${String(cs.p10).padStart(3)} | ${String(cs.p90).padStart(3)} |   - |   -`
    );
  }
  const genS = stats(genLenBySyl[s] || []);
  if ((genLenBySyl[s]?.length || 0) > 0) {
    console.log(
      `${String(s).padStart(3)} | Gen    | ${genS.mean.toFixed(1).padStart(5)} | ${String(genS.median).padStart(6)} | ${String(genS.p10).padStart(3)} | ${String(genS.p90).padStart(3)} | ${String(genS.min).padStart(3)} | ${String(genS.max).padStart(3)}`
    );
  }
}

// Overall
const allGenLens = Object.values(genLenBySyl).flat();
const genOverall = stats(allGenLens);
console.log(`\nOverall CMU: mean=${baseline.overallStats.mean}, median=${baseline.overallStats.median}`);
console.log(`Overall Gen: mean=${genOverall.mean.toFixed(2)}, median=${genOverall.median}`);

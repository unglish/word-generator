/**
 * Analyze syllable count distribution: CMU dictionary vs generated (lexicon mode).
 *
 * Usage: npx tsx scripts/analyze-syllable-distribution.ts [--sample N]
 */
import { generateWord } from "../src/core/generate.js";
import { readFileSync } from "fs";

const SAMPLE = Number(process.argv.find((_, i, a) => a[i - 1] === "--sample") ?? 200000);

// --- CMU dictionary syllable counts ---
// Count syllables by counting vowel phonemes (digits = stress markers on vowels)
const cmuLines = readFileSync("data/cmudict-0.7b.txt", "utf8").split("\n");
const cmuSylCounts: Record<number, number> = {};
const cmuLenBySyl: Record<number, number[]> = {};
let cmuTotal = 0;

for (const line of cmuLines) {
  if (!line || line.startsWith(";;;")) continue;
  const spaceIdx = line.indexOf(" ");
  if (spaceIdx < 0) continue;
  const word = line.slice(0, spaceIdx).replace(/\(\d+\)$/, "");
  const phonemes = line.slice(spaceIdx + 1).trim();
  if (!word || !phonemes) continue;

  // Count vowel phonemes (contain a digit for stress)
  const sylCount = (phonemes.match(/\d/g) || []).length;
  if (sylCount === 0) continue;

  cmuSylCounts[sylCount] = (cmuSylCounts[sylCount] || 0) + 1;
  if (!cmuLenBySyl[sylCount]) cmuLenBySyl[sylCount] = [];
  cmuLenBySyl[sylCount].push(word.length);
  cmuTotal++;
}

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
  const cmuS = stats(cmuLenBySyl[s] || []);
  const genS = stats(genLenBySyl[s] || []);
  if ((cmuLenBySyl[s]?.length || 0) > 0) {
    console.log(
      `${String(s).padStart(3)} | CMU    | ${cmuS.mean.toFixed(1).padStart(5)} | ${String(cmuS.median).padStart(6)} | ${String(cmuS.p10).padStart(3)} | ${String(cmuS.p90).padStart(3)} | ${String(cmuS.min).padStart(3)} | ${String(cmuS.max).padStart(3)}`
    );
  }
  if ((genLenBySyl[s]?.length || 0) > 0) {
    console.log(
      `${String(s).padStart(3)} | Gen    | ${genS.mean.toFixed(1).padStart(5)} | ${String(genS.median).padStart(6)} | ${String(genS.p10).padStart(3)} | ${String(genS.p90).padStart(3)} | ${String(genS.min).padStart(3)} | ${String(genS.max).padStart(3)}`
    );
  }
}

// Overall
const allCmuLens = Object.values(cmuLenBySyl).flat();
const allGenLens = Object.values(genLenBySyl).flat();
const cmuOverall = stats(allCmuLens);
const genOverall = stats(allGenLens);
console.log(`\nOverall CMU: mean=${cmuOverall.mean.toFixed(2)}, median=${cmuOverall.median}`);
console.log(`Overall Gen: mean=${genOverall.mean.toFixed(2)}, median=${genOverall.median}`);

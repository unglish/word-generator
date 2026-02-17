/**
 * Pre-compute CMU dictionary baseline stats for word-length analysis.
 * Run once (or after updating cmudict): npx tsx scripts/build-cmu-baseline.ts
 *
 * Outputs: data/cmu-length-baseline.json
 */
import { readFileSync, writeFileSync } from "fs";

const cmuLines = readFileSync("data/cmudict-0.7b.txt", "utf8").split("\n");

const byLen: Record<number, number> = {};
const bySyl: Record<number, number> = {};
const bySylLen: Record<number, Record<number, number>> = {};
let total = 0;

for (const line of cmuLines) {
  if (!line || line.startsWith(";;;")) continue;
  const spaceIdx = line.indexOf(" ");
  if (spaceIdx < 0) continue;
  const word = line.slice(0, spaceIdx).replace(/\(\d+\)$/, "");
  const phonemes = line.slice(spaceIdx + 1).trim();
  if (!word || !phonemes) continue;

  const sylCount = (phonemes.match(/\d/g) || []).length;
  if (sylCount === 0) continue;
  const len = word.length;

  byLen[len] = (byLen[len] || 0) + 1;
  bySyl[sylCount] = (bySyl[sylCount] || 0) + 1;
  if (!bySylLen[sylCount]) bySylLen[sylCount] = {};
  bySylLen[sylCount][len] = (bySylLen[sylCount][len] || 0) + 1;
  total++;
}

// Compute per-syllable stats
function stats(counts: Record<number, number>) {
  const entries = Object.entries(counts).map(([l, c]) => [Number(l), c] as const);
  const n = entries.reduce((s, [, c]) => s + c, 0);
  if (n === 0) return { mean: 0, median: 0, p10: 0, p90: 0 };

  const sorted: number[] = [];
  for (const [l, c] of entries) for (let i = 0; i < c; i++) sorted.push(l);
  sorted.sort((a, b) => a - b);

  return {
    mean: Math.round((sorted.reduce((a, b) => a + b, 0) / n) * 100) / 100,
    median: sorted[Math.floor(n / 2)],
    p10: sorted[Math.floor(n * 0.1)],
    p90: sorted[Math.floor(n * 0.9)],
  };
}

const sylStats: Record<number, { count: number; stats: ReturnType<typeof stats>; byLen: Record<number, number> }> = {};
for (const [syl, counts] of Object.entries(bySylLen)) {
  const s = Number(syl);
  sylStats[s] = {
    count: bySyl[s],
    stats: stats(counts),
    byLen: counts,
  };
}

const baseline = {
  source: "CMU Pronouncing Dictionary 0.7b",
  total,
  byLen,
  bySyl,
  bySylLen: sylStats,
  overallStats: stats(byLen),
};

writeFileSync("data/cmu-length-baseline.json", JSON.stringify(baseline, null, 2) + "\n");
console.log(`Wrote data/cmu-length-baseline.json (${total} words)`);

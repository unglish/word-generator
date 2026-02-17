/**
 * Analyze letter-length distribution: CMU dictionary vs generated (lexicon mode).
 * Uses pre-computed baseline from data/cmu-length-baseline.json.
 * Shows overall distribution and per-syllable-count breakdown with current
 * letterLengthTargets overlaid.
 *
 * Usage: npx tsx scripts/analyze-letter-length.ts [--sample N]
 */
import { generateWord } from "../src/core/generate.js";
import { readFileSync } from "fs";
import { LETTER_LENGTH_TARGETS } from "../src/config/weights.js";

const SAMPLE = Number(process.argv.find((_, i, a) => a[i - 1] === "--sample") ?? 200000);

// --- Load pre-computed CMU baseline ---
const baseline = JSON.parse(readFileSync("data/cmu-length-baseline.json", "utf8"));
const cmuByLen: Record<number, number> = baseline.byLen;
const cmuTotal: number = baseline.total;

// --- Generated ---
const genByLen: Record<number, number> = {};
const genBySylLen: Record<number, Record<number, number>> = {};

for (let i = 0; i < SAMPLE; i++) {
  const w = generateWord({ seed: i, mode: "lexicon" });
  const sylCount = w.syllables.length;
  const len = w.written.clean.length;

  genByLen[len] = (genByLen[len] || 0) + 1;
  if (!genBySylLen[sylCount]) genBySylLen[sylCount] = {};
  genBySylLen[sylCount][len] = (genBySylLen[sylCount][len] || 0) + 1;
}

// --- Overall length distribution ---
const maxLen = Math.max(
  ...Object.keys(cmuByLen).map(Number),
  ...Object.keys(genByLen).map(Number)
);

console.log("=== Overall Letter-Length Distribution ===\n");
console.log("Len | CMU%     | Gen%     | Ratio  | Δ (Gen-CMU)");
console.log("----|----------|----------|--------|------------");
for (let i = 1; i <= Math.min(maxLen, 22); i++) {
  const cmuPct = ((cmuByLen[i] || 0) / cmuTotal) * 100;
  const genPct = ((genByLen[i] || 0) / SAMPLE) * 100;
  const ratio = cmuPct > 0.01 ? (genPct / cmuPct).toFixed(2) : "N/A";
  const delta = (genPct - cmuPct).toFixed(2);
  console.log(
    `${String(i).padStart(3)} | ${cmuPct.toFixed(2).padStart(6)}%  | ${genPct.toFixed(2).padStart(6)}%  | ${String(ratio).padStart(6)} | ${delta.padStart(10)}%`
  );
}

// --- Per-syllable breakdown ---
console.log("\n=== Letter-Length Distribution by Syllable Count ===");

for (let syl = 1; syl <= 5; syl++) {
  const cmuSyl = baseline.bySylLen[syl]?.byLen || {};
  const genSyl = genBySylLen[syl] || {};
  const cmuSylTotal = Object.values(cmuSyl as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
  const genSylTotal = Object.values(genSyl).reduce((a, b) => a + b, 0);
  if (cmuSylTotal === 0 && genSylTotal === 0) continue;

  const targets = LETTER_LENGTH_TARGETS[syl];
  const targetStr = targets
    ? `[min=${targets[0]}, peakMin=${targets[1]}, peakMax=${targets[2]}, max=${targets[3]}]`
    : "none";

  const cmuMean = baseline.bySylLen[syl]?.stats?.mean ?? "N/A";
  const genLens = Object.entries(genSyl).flatMap(([l, c]) => Array(c as number).fill(Number(l)));
  const genMean = genLens.length ? (genLens.reduce((a: number, b: number) => a + b) / genLens.length).toFixed(1) : "N/A";

  console.log(`\n--- ${syl}-syllable words (CMU: ${cmuSylTotal}, Gen: ${genSylTotal}) ---`);
  console.log(`    letterLengthTargets: ${targetStr}`);
  console.log("Len | CMU%     | Gen%     | Ratio  | In target?");
  console.log("----|----------|----------|--------|----------");

  const sylMaxLen = Math.max(
    ...Object.keys(cmuSyl).map(Number),
    ...Object.keys(genSyl).map(Number)
  );
  for (let i = 1; i <= Math.min(sylMaxLen, 20); i++) {
    const cmuPct = cmuSylTotal > 0 ? (((cmuSyl as any)[i] || 0) / cmuSylTotal) * 100 : 0;
    const genPct = genSylTotal > 0 ? ((genSyl[i] || 0) / genSylTotal) * 100 : 0;
    if (cmuPct < 0.05 && genPct < 0.05) continue;
    const ratio = cmuPct > 0.05 ? (genPct / cmuPct).toFixed(2) : "N/A";
    let inTarget = "";
    if (targets) {
      if (i >= targets[1] && i <= targets[2]) inTarget = "peak";
      else if (i >= targets[0] && i <= targets[3]) inTarget = "ok";
      else inTarget = "OUT";
    }
    console.log(
      `${String(i).padStart(3)} | ${cmuPct.toFixed(2).padStart(6)}%  | ${genPct.toFixed(2).padStart(6)}%  | ${String(ratio).padStart(6)} | ${inTarget}`
    );
  }
  console.log(`    CMU mean: ${cmuMean}, Gen mean: ${genMean}`);
}

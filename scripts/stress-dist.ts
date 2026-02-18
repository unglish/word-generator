/**
 * Measure stress placement distribution for generated words.
 * Compares against CMU baselines.
 */
import { generateWord } from "../src/core/generate.js";

const N = 200_000;

// Track by syllable count: { sylCount: { position: count } }
const dist: Record<number, Record<number, number>> = {};
const sylCounts: Record<number, number> = {};

for (let i = 0; i < N; i++) {
  const word = generateWord({ seed: i, mode: "lexicon" });
  const syls = word.syllables;
  const sylCount = syls.length;

  sylCounts[sylCount] = (sylCounts[sylCount] || 0) + 1;

  if (sylCount < 2) continue;

  if (!dist[sylCount]) dist[sylCount] = {};
  const primaryIdx = syls.findIndex(s => s.stress === "ˈ");
  if (primaryIdx >= 0) {
    dist[sylCount][primaryIdx] = (dist[sylCount][primaryIdx] || 0) + 1;
  }
}

console.log("\n=== Stress Distribution (200k sample) ===\n");

for (const sc of Object.keys(dist).map(Number).sort()) {
  const total = sylCounts[sc];
  const positions = dist[sc];
  console.log(`${sc}-syllable words (n=${total}):`);
  for (const pos of Object.keys(positions).map(Number).sort()) {
    const pct = ((positions[pos] / total) * 100).toFixed(1);
    const label = pos === 0 ? "initial" : pos === sc - 1 ? "final" : `syl-${pos + 1}`;
    console.log(`  ${label}: ${pct}% (${positions[pos]})`);
  }
  console.log();
}

/**
 * Measure phoneme-length distribution of 200k generated words (lexicon mode)
 * vs CMU dictionary baseline.
 *
 * Usage: npx tsx scripts/phoneme-length-dist.ts
 */
import { generateWord } from '../src/core/generate.js';
import { readFileSync } from 'fs';

const N = 200_000;

// --- CMU baseline ---
const cmuLines = readFileSync('data/cmudict-0.7b.txt', 'utf8').split('\n');
const cmuCounts: Record<number, number> = {};
let cmuTotal = 0;
for (const line of cmuLines) {
  if (!line || line.startsWith(';;;')) continue;
  const spaceIdx = line.indexOf(' ');
  if (spaceIdx < 0) continue;
  // skip alternate pronunciations (word(2))
  const wordPart = line.slice(0, spaceIdx);
  if (/\(\d+\)$/.test(wordPart)) continue;
  const phonemes = line.slice(spaceIdx + 1).trim().split(/\s+/);
  const len = phonemes.length;
  cmuCounts[len] = (cmuCounts[len] ?? 0) + 1;
  cmuTotal++;
}

// --- Generated ---
const genCounts: Record<number, number> = {};
for (let i = 0; i < N; i++) {
  const w = generateWord({ seed: i, mode: 'lexicon' });
  let len = 0;
  for (const syl of w.syllables) {
    len += syl.onset.length + syl.nucleus.length + syl.coda.length;
  }
  genCounts[len] = (genCounts[len] ?? 0) + 1;
}

// --- Print ---
const allKeys = new Set([
  ...Object.keys(cmuCounts).map(Number),
  ...Object.keys(genCounts).map(Number),
]);
const sorted = [...allKeys].sort((a, b) => a - b);

console.log('phonemes | generated% | cmu%   | delta');
console.log('---------|------------|--------|------');
for (const k of sorted) {
  if (k < 1 || k > 16) continue;
  const gPct = ((genCounts[k] ?? 0) / N * 100);
  const cPct = ((cmuCounts[k] ?? 0) / cmuTotal * 100);
  const delta = gPct - cPct;
  console.log(
    `${String(k).padEnd(8)} | ${gPct.toFixed(2).padEnd(10)} | ${cPct.toFixed(2).padEnd(6)} | ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`
  );
}
console.log(`\nGenerated: ${N.toLocaleString()} words`);
console.log(`CMU:       ${cmuTotal.toLocaleString()} entries`);

/**
 * Generate 100k words and measure error rates for the three repair categories.
 * Run with: npx tsx scripts/validate-repairs.ts
 */
import { generateWord } from "../src/core/generate.js";

const SAMPLE_SIZE = 100_000;

// Banned cross-syllable pairs (same as in repair.ts)
const BANNED_PAIRS = new Set([
  "ŋ|p", "ŋ|b", "ŋ|t", "ŋ|d", "ŋ|f", "ŋ|v", "ŋ|θ", "ŋ|ð",
  "ŋ|s", "ŋ|z", "ŋ|ʃ", "ŋ|ʒ", "ŋ|tʃ", "ŋ|dʒ", "ŋ|m", "ŋ|n",
  "ŋ|l", "ŋ|r", "ŋ|j", "ŋ|w", "ŋ|h",
  "ʒ|p", "ʒ|b", "ʒ|t", "ʒ|d", "ʒ|k", "ʒ|g",
  "ð|p", "ð|b", "ð|t", "ð|d", "ð|k", "ð|g",
  "h|p", "h|b", "h|t", "h|d", "h|k", "h|g",
  "p|b", "b|p", "t|d", "d|t", "k|g", "g|k",
  "m|t", "m|d", "m|k", "m|g", "n|p", "n|b",
]);

const DISALLOWED_FINAL = new Set(["ʒ", "ð", "h", "j", "w"]);

let clusterErrors = 0;
let codaErrors = 0;
let hardGErrors = 0;

for (let i = 0; i < SAMPLE_SIZE; i++) {
  const word = generateWord();
  const { syllables, written } = word;

  // Check cross-syllable clusters
  for (let si = 0; si < syllables.length - 1; si++) {
    const coda = syllables[si].coda;
    const onset = syllables[si + 1].onset;
    if (coda.length > 0 && onset.length > 0) {
      const pair = `${coda[coda.length - 1].sound}|${onset[0].sound}`;
      if (BANNED_PAIRS.has(pair)) {
        clusterErrors++;
        break;
      }
    }
  }

  // Check word-final coda
  const lastSyl = syllables[syllables.length - 1];
  if (lastSyl.coda.length > 0) {
    const finalSound = lastSyl.coda[lastSyl.coda.length - 1].sound;
    if (DISALLOWED_FINAL.has(finalSound)) {
      codaErrors++;
    }
  }

  // Check hard-g collision: 'g' at end of syllable followed by e/i/y without 'u' buffer
  const clean = written.clean;
  // Check if any coda /g/ is followed by e/i/y in the written form without 'gu'
  for (let si = 0; si < syllables.length - 1; si++) {
    const coda = syllables[si].coda;
    if (coda.length > 0 && coda[coda.length - 1].sound === "g") {
      // Find approximate position - check if 'ge', 'gi', or 'gy' exists without 'gu' before it
      const matches = clean.match(/g[eiy]/g);
      if (matches) {
        // Check it's not 'gue', 'gui', 'guy' 
        const guMatches = clean.match(/gu[eiy]/g);
        const bareGFrontVowel = (matches?.length ?? 0) - (guMatches?.length ?? 0);
        if (bareGFrontVowel > 0) {
          hardGErrors++;
          break;
        }
      }
    }
  }
}

console.log(`Sample size: ${SAMPLE_SIZE.toLocaleString()}`);
console.log(`\nCross-syllable cluster errors: ${clusterErrors} (${(clusterErrors / SAMPLE_SIZE * 100).toFixed(2)}%)`);
console.log(`Word-final coda errors: ${codaErrors} (${(codaErrors / SAMPLE_SIZE * 100).toFixed(2)}%)`);
console.log(`Hard-g visual collisions: ${hardGErrors} (${(hardGErrors / SAMPLE_SIZE * 100).toFixed(2)}%)`);

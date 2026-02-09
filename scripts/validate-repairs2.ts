import { generateWord } from "../src/core/generate.js";

const SAMPLE_SIZE = 100_000;
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
const hardGExamples: string[] = [];
const clusterExamples: string[] = [];

for (let i = 0; i < SAMPLE_SIZE; i++) {
  const word = generateWord();
  const { syllables, written } = word;

  for (let si = 0; si < syllables.length - 1; si++) {
    const coda = syllables[si].coda;
    const onset = syllables[si + 1].onset;
    if (coda.length > 0 && onset.length > 0) {
      const pair = `${coda[coda.length - 1].sound}|${onset[0].sound}`;
      if (BANNED_PAIRS.has(pair)) {
        clusterErrors++;
        if (clusterExamples.length < 5) clusterExamples.push(`${written.clean} (${word.pronunciation}) [${pair}]`);
        break;
      }
    }
  }

  const lastSyl = syllables[syllables.length - 1];
  if (lastSyl.coda.length > 0) {
    const finalSound = lastSyl.coda[lastSyl.coda.length - 1].sound;
    if (DISALLOWED_FINAL.has(finalSound)) codaErrors++;
  }

  // More precise hard-g check: only coda /g/ followed by front-vowel grapheme
  for (let si = 0; si < syllables.length - 1; si++) {
    const coda = syllables[si].coda;
    if (coda.length > 0 && coda[coda.length - 1].sound === "g") {
      // Get syllable text parts and check boundary
      // We need to check the actual written form at this boundary
      const parts = written.hyphenated.split('&shy;');
      if (si < parts.length - 1) {
        const thisPart = parts[si];
        const nextPart = parts[si + 1];
        if (thisPart.endsWith('g') && /^[eiy]/i.test(nextPart)) {
          hardGErrors++;
          if (hardGExamples.length < 10) hardGExamples.push(`${written.clean} (hyph: ${parts.join('-')}) pron: ${word.pronunciation}`);
          break;
        }
      }
    }
  }
}

console.log(`Sample size: ${SAMPLE_SIZE.toLocaleString()}`);
console.log(`\nCross-syllable cluster errors: ${clusterErrors} (${(clusterErrors / SAMPLE_SIZE * 100).toFixed(2)}%)`);
if (clusterExamples.length) console.log(`  Examples: ${clusterExamples.join(', ')}`);
console.log(`Word-final coda errors: ${codaErrors} (${(codaErrors / SAMPLE_SIZE * 100).toFixed(2)}%)`);
console.log(`Hard-g visual collisions: ${hardGErrors} (${(hardGErrors / SAMPLE_SIZE * 100).toFixed(2)}%)`);
if (hardGExamples.length) console.log(`  Examples: ${hardGExamples.join('\n           ')}`);

/**
 * Generate 100k words and validate phonotactic repair error rates.
 * Run with: npx tsx scripts/validate-repairs.ts
 */
import { generateWord } from "../src/core/generate.js";
import { englishConfig } from "../src/config/english.js";

const SAMPLE_SIZE = 100_000;

const BANNED_PAIRS = new Set(
  englishConfig.clusterConstraint!.banned!.map(([a, b]) => `${a}|${b}`),
);

const ALLOWED_FINAL = new Set(englishConfig.codaConstraints!.allowedFinal!);

let clusterErrors = 0;
let codaErrors = 0;
let hardGErrors = 0;
const clusterExamples: string[] = [];
const codaExamples: string[] = [];
const hardGExamples: string[] = [];

for (let i = 0; i < SAMPLE_SIZE; i++) {
  const word = generateWord();
  const { syllables, written } = word;

  // Cross-syllable cluster check
  for (let si = 0; si < syllables.length - 1; si++) {
    const coda = syllables[si].coda;
    const onset = syllables[si + 1].onset;
    if (coda.length > 0 && onset.length > 0) {
      const pair = `${coda[coda.length - 1].sound}|${onset[0].sound}`;
      if (BANNED_PAIRS.has(pair)) {
        clusterErrors++;
        if (clusterExamples.length < 5)
          clusterExamples.push(`${written.clean} (${word.pronunciation}) [${pair}]`);
        break;
      }
    }
  }

  // Word-final coda check (strip aspiration marks added by pronounce.ts)
  const lastSyl = syllables[syllables.length - 1];
  if (lastSyl.coda.length > 0) {
    const finalSound = lastSyl.coda[lastSyl.coda.length - 1].sound.replace(/ʰ$/, "");
    if (!ALLOWED_FINAL.has(finalSound)) {
      codaErrors++;
      if (codaExamples.length < 5)
        codaExamples.push(`${written.clean} (${word.pronunciation}) final=[${finalSound}]`);
    }
  }

  // Hard-g check: syllable-boundary approach
  for (let si = 0; si < syllables.length - 1; si++) {
    const coda = syllables[si].coda;
    if (coda.length > 0 && coda[coda.length - 1].sound === "g") {
      const parts = written.hyphenated.split("&shy;");
      if (si < parts.length - 1) {
        const thisPart = parts[si];
        const nextPart = parts[si + 1];
        if (thisPart.endsWith("g") && /^[eiy]/i.test(nextPart)) {
          hardGErrors++;
          if (hardGExamples.length < 5)
            hardGExamples.push(`${written.clean} (${parts.join("-")}) ${word.pronunciation}`);
          break;
        }
      }
    }
  }
}

console.log(`Sample size: ${SAMPLE_SIZE.toLocaleString()}\n`);

console.log(`Cross-syllable cluster errors: ${clusterErrors} (${(clusterErrors / SAMPLE_SIZE * 100).toFixed(2)}%)`);
if (clusterExamples.length) console.log(`  Examples: ${clusterExamples.join("\n           ")}`);

console.log(`Word-final coda errors: ${codaErrors} (${(codaErrors / SAMPLE_SIZE * 100).toFixed(2)}%)`);
if (codaExamples.length) console.log(`  Examples: ${codaExamples.join("\n           ")}`);

console.log(`Hard-g visual collisions: ${hardGErrors} (${(hardGErrors / SAMPLE_SIZE * 100).toFixed(2)}%)`);
if (hardGExamples.length) console.log(`  Examples: ${hardGExamples.join("\n           ")}`);

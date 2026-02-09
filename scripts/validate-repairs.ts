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

// ---------------------------------------------------------------------------
// Cluster length and sonority checks
// ---------------------------------------------------------------------------

const CL = englishConfig.clusterLimits!;
const codaAppendants = new Set(CL.codaAppendants ?? []);
const attestedOnsets = new Set(CL.attestedOnsets!.map(a => a.join("|")));

let onsetLenErrors = 0;
let codaLenErrors = 0;
let unattestedOnsetErrors = 0;
const onsetLenExamples: string[] = [];
const codaLenExamples: string[] = [];
const unattestedExamples: string[] = [];

// Rerun to gather cluster stats (or we could have done it in the same loop)
for (let i = 0; i < SAMPLE_SIZE; i++) {
  const word = generateWord();
  const { syllables, written } = word;

  for (const syl of syllables) {
    // Onset length check
    if (syl.onset.length > CL.maxOnset) {
      onsetLenErrors++;
      if (onsetLenExamples.length < 5)
        onsetLenExamples.push(`${written.clean} onset=[${syl.onset.map(p=>p.sound).join("")}]`);
    }

    // Coda length check
    if (syl.coda.length > 0) {
      const lastSound = syl.coda[syl.coda.length - 1].sound;
      const effectiveMax = codaAppendants.has(lastSound) ? CL.maxCoda + 1 : CL.maxCoda;
      if (syl.coda.length > effectiveMax) {
        codaLenErrors++;
        if (codaLenExamples.length < 5)
          codaLenExamples.push(`${written.clean} coda=[${syl.coda.map(p=>p.sound).join("")}]`);
      }
    }

    // Attested onset check (strip aspiration marks added by pronounce.ts)
    if (syl.onset.length >= 2) {
      const key = syl.onset.map(p => p.sound.replace(/ʰ$/, "")).join("|");
      if (!attestedOnsets.has(key)) {
        unattestedOnsetErrors++;
        if (unattestedExamples.length < 5)
          unattestedExamples.push(`${written.clean} onset=[${syl.onset.map(p=>p.sound).join("")}]`);
      }
    }
  }
}

console.log(`\n--- Cluster validation (second 100k sample) ---`);
console.log(`Onset length violations (>${CL.maxOnset}): ${onsetLenErrors} (${(onsetLenErrors / SAMPLE_SIZE * 100).toFixed(2)}%)`);
if (onsetLenExamples.length) console.log(`  Examples: ${onsetLenExamples.join("\n           ")}`);

console.log(`Coda length violations (>${CL.maxCoda}+appendant): ${codaLenErrors} (${(codaLenErrors / SAMPLE_SIZE * 100).toFixed(2)}%)`);
if (codaLenExamples.length) console.log(`  Examples: ${codaLenExamples.join("\n           ")}`);

console.log(`Unattested onset errors: ${unattestedOnsetErrors} (${(unattestedOnsetErrors / SAMPLE_SIZE * 100).toFixed(2)}%)`);
if (unattestedExamples.length) console.log(`  Examples: ${unattestedExamples.join("\n           ")}`);

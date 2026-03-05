/**
 * Compare lexicon-mode length metrics with morphology on/off.
 *
 * Usage:
 *   npx tsx scripts/length-semantics-check.ts --sample 30000 --seed 1000
 */
import { readFileSync } from "node:fs";
import { generateWord } from "../src/core/generate.js";

function parseArg(name: string, fallback: number): number {
  const idx = process.argv.indexOf(name);
  if (idx < 0) return fallback;
  const raw = Number(process.argv[idx + 1]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

type Metrics = {
  avgLetters: number;
  avgPhonemes: number;
  pct13PlusLetters: number;
  pct15PlusPhonemes: number;
};

function measure(sample: number, seedStart: number, morphology: boolean): Metrics {
  let sumLetters = 0;
  let sumPhonemes = 0;
  let letters13Plus = 0;
  let phonemes15Plus = 0;

  for (let i = 0; i < sample; i++) {
    const word = generateWord({
      seed: seedStart + i,
      mode: "lexicon",
      morphology,
    });
    const letters = word.written.clean.length;
    let phonemes = 0;
    for (const syllable of word.syllables) {
      phonemes += syllable.onset.length + syllable.nucleus.length + syllable.coda.length;
    }
    sumLetters += letters;
    sumPhonemes += phonemes;
    if (letters >= 13) letters13Plus++;
    if (phonemes >= 15) phonemes15Plus++;
  }

  return {
    avgLetters: sumLetters / sample,
    avgPhonemes: sumPhonemes / sample,
    pct13PlusLetters: (letters13Plus / sample) * 100,
    pct15PlusPhonemes: (phonemes15Plus / sample) * 100,
  };
}

const sample = parseArg("--sample", 30000);
const seedStart = parseArg("--seed", 1000);

const cmuLengthBaseline = JSON.parse(readFileSync("data/cmu-length-baseline.json", "utf8"));
const cmuMeanLetters = Number(cmuLengthBaseline?.overallStats?.mean ?? NaN);

const withMorph = measure(sample, seedStart, true);
const bareRoot = measure(sample, seedStart, false);

function fmt(label: string, m: Metrics): string {
  return [
    `${label}:`,
    `avgLetters=${m.avgLetters.toFixed(3)}`,
    `avgPhonemes=${m.avgPhonemes.toFixed(3)}`,
    `13+letters=${m.pct13PlusLetters.toFixed(2)}%`,
    `15+phonemes=${m.pct15PlusPhonemes.toFixed(2)}%`,
  ].join(" ");
}

console.log(`sample=${sample} seedStart=${seedStart}`);
if (Number.isFinite(cmuMeanLetters)) {
  console.log(`cmuMeanLetters=${cmuMeanLetters.toFixed(2)}`);
}
console.log(fmt("morphology=true", withMorph));
console.log(fmt("morphology=false", bareRoot));

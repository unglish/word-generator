import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const { createSeededRng } = await import(pathToFileURL(resolve("src/utils/random.ts")).href);
const root = process.argv[3] || ".";
const api = await import(pathToFileURL(resolve(root, "src/index.ts")).href);
const candidate = await import(pathToFileURL(resolve("src/index.ts")).href);
const replay = root !== "." ? candidate.createGenerator(api.englishConfig) : undefined;
const seed = Number(process.argv[2]);
const baseline = JSON.parse(readFileSync("data/cmu/cmu-lexicon-bigrams.json", "utf8"));
const cmuBigrams = Object.values(baseline).reduce((sum, value) => sum + value, 0);
const cmuFrequency = baseline.cc / cmuBigrams;
const sampleSize = 200_000;
const random = createSeededRng(seed);
let state = seed;
const rand = () => {
  state = (state + 0x6d2b79f5) >>> 0;
  return random();
};
let total = 0;
let ableCount = 0;
const witnesses = [];
for (let i = 0; i < sampleSize; i++) {
  const checkpoint = state;
  const word = api.generateWord({ rand, mode: "lexicon", morphology: true });
  const written = word.written.clean.toLowerCase();
  total += written.length - 1;
  if (!written.includes("cc") && !written.endsWith("able")) continue;
  const opts = { seed: checkpoint, mode: "lexicon", morphology: true, trace: true };
  const traced = api.generateWord(opts);
  assert.equal(traced.written.clean, word.written.clean);
  assert.equal(traced.pronunciation, word.pronunciation);
  if (traced.trace.morphology?.suffix === "able") ableCount++;
  if (!written.includes("cc")) continue;
  if (replay) assert.deepEqual(replay.generateWord(opts), traced);
  const root = traced.trace.stages.find(s => s.name === "repairNucleusWordPositions").after;
  witnesses.push({
    index: i,
    word: written,
    occurrences: written.match(/(?=cc)/g).length,
    trace: {
      syllables: root.length,
      finalCoda: root.at(-1).coda,
      graphemeSelections: traced.trace.graphemeSelections,
      structural: traced.trace.structural,
      repairs: traced.trace.repairs,
      morphology: traced.trace.morphology,
      baseSpelling: traced.trace.baseSpelling?.surface,
    },
  });
}
const ccCount = witnesses.reduce((total, witness) => total + witness.occurrences, 0);
console.log(JSON.stringify({ seed, sampleSize, total, cmuCcCount: baseline.cc, cmuBigrams, cmuFrequency,
  ccCount, ratio: ccCount / total / cmuFrequency, ableCount, legacyReplay: !!replay, witnesses }));

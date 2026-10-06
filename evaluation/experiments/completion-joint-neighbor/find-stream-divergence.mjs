import { readFileSync, writeFileSync } from "node:fs";
import { createGenerator, createSeededRng, englishConfig } from "../../../src/index.ts";
import { createGenerator as controlGenerator, englishConfig as controlConfig } from "/private/tmp/q14a-completion-isolated-u-v1/src/index.ts";
const splitVowels = JSON.parse(readFileSync(new URL("../completion-isolated-u/configuration.json", import.meta.url)));
const candidate = createGenerator({ ...englishConfig, splitVowels });
const control = controlGenerator({ ...controlConfig, splitVowels });
const seed = 1498885173;
const a = createSeededRng(seed), b = createSeededRng(seed);
let aCalls = 0, bCalls = 0;
const randA = () => { aCalls++; return a(); }, randB = () => { bCalls++; return b(); };
for (let drawIndex = 0; drawIndex <= 5738; drawIndex++) {
  const candidateWord = candidate.generateWord({ mode: "lexicon", morphology: false, trace: true, rand: randA });
  const controlWord = control.generateWord({ mode: "lexicon", morphology: false, trace: true, rand: randB });
  if (candidateWord.written.clean !== controlWord.written.clean || aCalls !== bCalls) {
    const result = { seed, drawIndex, aCalls, bCalls, candidateWord, controlWord };
    writeFileSync(new URL("first-stream-divergence.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
    console.log(JSON.stringify({ seed, drawIndex, aCalls, bCalls, candidate: candidateWord.written.clean, control: controlWord.written.clean }));
    break;
  }
}

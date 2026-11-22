import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { generateWords } = await import(pathToFileURL(resolve("src/index.ts")).href);
const sampleSize = 30000;
const transitions = {};
for (let count = 1; count <= 5; count++) {
  const histogram = {};
  for (const word of generateWords(sampleSize, { mode: "lexicon", seed: 491004 + count, syllableCount: count, morphology: true })) {
    const length = Math.min(word.syllables.length, 6);
    histogram[length] = (histogram[length] ?? 0) + 1;
  }
  transitions[count] = histogram;
}
console.log(JSON.stringify(transitions, null, 2));

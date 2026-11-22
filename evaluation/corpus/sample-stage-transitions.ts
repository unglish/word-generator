/** Sample finished counts at each configured root length through the public API. */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { jsonDigest } from "./identity.js";
import { createSeededRng } from "../../src/utils/random.js";

const directory = resolve(process.argv[2] ?? ".");
const { createGenerator, englishConfig }: typeof import("../../src/index.js") = await import(
  pathToFileURL(resolve(directory, "src/index.ts")).href
);
const git = (...args: string[]) => execFileSync("git", ["-C", directory, ...args], { encoding: "utf8" }).trim();

if (git("status", "--porcelain", "--", "src")) {
  throw new Error("Use a clean generator source tree for transition sampling");
}

const sampleSize = 30_000;
const seedBase = 491004;
const counts: Record<number, Record<number, number>> = {};

for (const syllables of Object.keys(englishConfig.morphology?.templateWeights.lexicon.byRootSyllables ?? {}).map(Number)) {
  const phonemeWeights: [number, number][] = [];
  const syllableWeights: Record<number, [number, number][]> = {};
  for (const [phones, options] of Object.entries(englishConfig.phonemeToSyllableWeights.lexicon)) {
    const weight = options.find(([count]) => count === syllables)?.[1];
    if (weight === undefined) continue;
    phonemeWeights.push([Number(phones), weight]);
    syllableWeights[Number(phones)] = [[syllables, 1]];
  }
  // Force the distribution through configuration so all root lengths use the
  // same path, including 8, which exceeds the public syllableCount override.
  const generator = createGenerator({
    ...englishConfig,
    phonemeLengthWeights: { ...englishConfig.phonemeLengthWeights, lexicon: phonemeWeights },
    phonemeToSyllableWeights: { ...englishConfig.phonemeToSyllableWeights, lexicon: syllableWeights },
  });
  const histogram: Record<number, number> = {};
  const rand = createSeededRng(seedBase + syllables);
  for (let i = 0; i < sampleSize; i++) {
    const word = generator.generateWord({ mode: "lexicon", rand, morphology: true });
    if (word.lexical?.root.length !== syllables) throw new Error(`Generated an unexpected root length for ${syllables}`);
    const finished = word.syllables.length;
    histogram[finished] = (histogram[finished] ?? 0) + 1;
  }
  counts[syllables] = histogram;
}
console.log(JSON.stringify({
  generatorRevision: git("rev-parse", "HEAD"),
  generatorSourceTree: git("rev-parse", "HEAD:src"),
  sampleSize,
  seedBase,
  countsDigest: jsonDigest(counts),
  counts,
}, null, 2));

import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createGenerator, englishConfig } from "../../../src/index.js";
import { buildGraphemeMaps } from "../../../src/elements/graphemes/index.js";
import type { LanguageConfig } from "../../../src/config/language.js";
import type { Grapheme } from "../../../src/types.js";
import { createFollowingObserver } from "./observe-following.js";

const destination = process.argv[2];
if (!destination) throw new Error("Provide a new output .jsonl.gz path");
const glyph = (phoneme: string, form: string, frequency = 1): Grapheme => ({
  phoneme, form, frequency, origin: 0, startWord: 1, midWord: 1, endWord: 1, reading: { kind: "single-phone" },
});
const graphemes = [glyph("b", "b"), glyph("ɛ", "e"), glyph("d", "ed", 1000000), glyph("d", "d")];
const phone = (sound: string) => englishConfig.phonemes.find(entry => entry.sound === sound)!;
const one: [number, number][] = [[1, 1]];
const config: LanguageConfig = { ...englishConfig, graphemes, ...buildGraphemeMaps(graphemes),
  phonemeMaps: { onset: new Map([["b", [phone("b")]]]), nucleus: new Map([["ɛ", [phone("ɛ")]]]), coda: new Map([["d", [phone("d")]]]) },
  clusterConstraint: undefined, clusterWeights: undefined, clusterLimits: { maxOnset: 1, maxCoda: 1 },
  codaConstraints: { allowedFinal: ["d"] },
  syllableStructure: { ...englishConfig.syllableStructure, maxOnsetLength: 1, maxCodaLength: 1, letterLengthTargets: undefined },
  phonemeLengthWeights: { text: [[3, 1]], lexicon: [[3, 1]] },
  generationWeights: { ...englishConfig.generationWeights,
    onsetLength: { monosyllabic: one, followingNucleus: one, default: one, long: one },
    codaLength: { monosyllabic: { 1: one }, monosyllabicDefault: one, polysyllabicNonzero: one, zeroWeightEndOfWord: 0, zeroWeightMidWord: 0 },
    probability: { ...englishConfig.generationWeights.probability, finalS: 0, nasalStopExtension: 0 } },
  sharedSpellings: [], doubling: undefined, silentE: undefined, spellingRules: [], gapSpellings: [],
  pronunciation: { ...englishConfig.pronunciation,
    aspiration: { enabled: false, targets: [{ segment: "onset" }], rules: [{ id: "disabled", when: {}, probability: 0 }], fallbackProbability: 0 },
    vowelReduction: { enabled: false, rules: [], reduceSecondaryStress: false } },
  writtenFormConstraints: { policy: "preserve-phones" },
};
const generator = createGenerator(config);
const observe = createFollowingObserver(config);
const rows = [JSON.stringify({ kind: "configuration", name: "normalized-custom", config })];
for (const seed of [13, 137, 4099]) {
  const word = generator.generateWord({ seed, syllableCount: 1, morphology: false, trace: true });
  const base = word.trace!.baseSpelling!;
  assert.ok(base.cells.some(cell => cell.origin.kind === "normalized"));
  const observation = observe(word);
  const root = observation.events.find(event => event.boundary === "final-root" && event.phoneId === 2)!;
  assert.equal(root.ownership, "single-owned");
  assert.equal(root.form, "d");
  const damaged = structuredClone(word);
  damaged.trace!.baseSpelling!.normalizationCertificates![0].editId += 1;
  assert.throws(() => observe(damaged));
  rows.push(JSON.stringify({ kind: "observation", name: "normalized-custom", coordinate: { seed }, word, observation }));
}
writeFileSync(destination, gzipSync(rows.join("\n") + "\n"), { flag: "wx" });
console.log(JSON.stringify({ destination, words: 3 }));

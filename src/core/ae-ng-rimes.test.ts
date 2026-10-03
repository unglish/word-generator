import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord } from "../index.js";
import type { LanguageConfig } from "../config/language.js";
import type { Word } from "../types.js";

function generatedSyllables(word: Word) {
  const stage = word.trace?.stages.find(candidate => candidate.name === "generateSyllables");
  if (!stage) throw new Error("Missing generation-stage trace.");
  return stage.after;
}

function fixedRime(nucleus: string, codas: string[], banned: NonNullable<LanguageConfig["codaConstraints"]>["bannedNucleusCodaCombinations"]): LanguageConfig {
  const phone = (sound: string) => englishConfig.phonemes.find(candidate => candidate.sound === sound)!;
  const singleton = (length: number): [number, number][] => [[length, 1]];
  const weights = englishConfig.generationWeights;
  return {
    ...englishConfig,
    phonemeMaps: {
      onset: new Map([["b", [phone("b")]]]),
      nucleus: new Map([[nucleus, [phone(nucleus)]]]),
      coda: new Map(codas.map(sound => [sound, [phone(sound)]])),
    },
    morphology: undefined,
    clusterConstraint: undefined,
    pronunciation: { ...englishConfig.pronunciation, aspiration: { enabled: false, targets: [{ segment: "onset", manner: ["stop"] }], rules: [{ id: "off", when: {}, probability: 0 }], fallbackProbability: 0 } },
    gapSpellings: [],
    codaConstraints: { ...englishConfig.codaConstraints, bannedNucleusCodaCombinations: banned },
    syllableStructure: { ...englishConfig.syllableStructure, letterLengthTargets: undefined },
    phonemeLengthWeights: { text: singleton(3), lexicon: singleton(3) },
    phonemeToSyllableWeights: { text: { 3: singleton(1) }, lexicon: { 3: singleton(1) } },
    generationWeights: {
      ...weights,
      onsetLength: { monosyllabic: singleton(1), followingNucleus: singleton(1), default: singleton(1), long: singleton(1) },
      codaLength: { monosyllabic: {}, monosyllabicDefault: singleton(1), polysyllabicNonzero: singleton(1), zeroWeightEndOfWord: 0, zeroWeightMidWord: 0 },
      probability: { ...weights.probability, nasalStopExtension: 0, finalS: 0 },
    },
  };
}

describe("supported TRAP plus velar-nasal rimes", () => {
  it.each([
    { seed: 985, syllableCount: 1, spelling: "ang", coda: ["ŋ"] },
    { seed: 13, syllableCount: 1, spelling: "smangs", coda: ["ŋ", "z"] },
    { seed: 5756, syllableCount: 3, spelling: "bangical", coda: ["ŋ"] },
  ])("samples /æŋ/ before later repairs at seed $seed", ({ seed, syllableCount, spelling, coda }) => {
    const word = generateWord({ seed, syllableCount, morphology: false, trace: true });
    expect(word.written.clean).toBe(spelling);
    const syllables = generatedSyllables(word);
    expect(syllables[0].nucleus).toEqual(["æ"]);
    expect(syllables[0].coda).toEqual(coda);
    if (syllableCount > 1) expect(syllables[1].onset).toEqual(["g"]);
  });

  it.each([
    { nucleus: "æ", banned: undefined, expected: "ŋ" },
    { nucleus: "æ", banned: [{ nucleus: ["æ"], coda: ["ŋ"] }], expected: "n" },
    { nucleus: "æ", banned: [{ nucleus: ["æ"], coda: ["n"] }], expected: "ŋ" },
    { nucleus: "ɚ", banned: englishConfig.codaConstraints!.bannedNucleusCodaCombinations, expected: "n" },
  ])("retains custom coda filtering for /$nucleus/ with result /$expected/", ({ nucleus, banned, expected }) => {
    const codas = banned ? ["ŋ", "n"] : ["ŋ"];
    const generator = createGenerator(fixedRime(nucleus, codas, banned));
    for (let seed = 0; seed < 50; seed++) {
      const syllable = generatedSyllables(generator.generateWord({ seed, morphology: false, trace: true }))[0];
      expect(syllable.nucleus).toEqual([nucleus]);
      expect(syllable.coda).toEqual([expected]);
    }
  });

  it.each(["æ", "u"])("applies every configured nucleus/coda alternative for /%s/", nucleus => {
    const generator = createGenerator(fixedRime(nucleus, ["ŋ", "n", "t"], [{ nucleus: ["æ", "u"], coda: ["ŋ", "n"] }]));
    for (let seed = 0; seed < 30; seed++) {
      const syllable = generatedSyllables(generator.generateWord({ seed, morphology: false, trace: true }))[0];
      expect(syllable.nucleus).toEqual([nucleus]);
      expect(syllable.coda).toEqual(["t"]);
    }
  });

  it.each([false, true])("preserves trace/no-trace output and RNG with morphology=%s", morphology => {
    const plainRng = createSeededRng(41822);
    const tracedRng = createSeededRng(41822);
    let plainCalls = 0;
    let tracedCalls = 0;
    for (let draw = 0; draw < 1000; draw++) {
      const plain = generateWord({ morphology, rand: () => { plainCalls++; return plainRng(); } });
      const { trace, ...traced } = generateWord({ morphology, trace: true, rand: () => { tracedCalls++; return tracedRng(); } });
      expect(trace).toBeDefined();
      expect(traced).toEqual(plain);
    }
    expect(tracedCalls).toBe(plainCalls);
    expect(tracedRng()).toBe(plainRng());
  });
});

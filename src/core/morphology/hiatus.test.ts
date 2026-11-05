import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord, generateWords } from "../../index.js";
import type { MorphHiatusDecisionTrace } from "../../index.js";
import type { Affix, LanguageConfig, MorphologyConfig } from "../../config/language.js";
import type { Grapheme, Word } from "../../types.js";

function fixedBoundary(options: {
  prefix?: string; suffix?: string; onset?: string; coda?: string;
  policy?: MorphologyConfig["boundaryPolicy"];
} = {}) {
  const { onset = "", coda = "", policy = englishConfig.morphology!.boundaryPolicy } = options;
  const prefix = englishConfig.morphology!.prefixes.find(affix => affix.written === options.prefix);
  const suffix = englishConfig.morphology!.suffixes.find(affix => affix.written === options.suffix);
  const shape = { onset: onset ? [onset] : [], nucleus: ["i:"], coda: coda ? [coda] : [] };
  // Root phoneme target only: affixes no longer count against the root.
  const target = Object.values(shape).flat().length;
  const phonemeMaps = { onset: new Map(), nucleus: new Map(), coda: new Map() } as LanguageConfig["phonemeMaps"];
  const graphemeMaps = { onset: new Map(), nucleus: new Map(), coda: new Map() } as LanguageConfig["graphemeMaps"];
  const graphemes: Grapheme[] = [];
  for (const position of ["onset", "nucleus", "coda"] as const) {
    for (const sound of shape[position]) {
      phonemeMaps[position].set(sound, [englishConfig.phonemes.find(phone => phone.sound === sound)!]);
      const glyph: Grapheme = { phoneme: sound, form: sound === "i:" ? "ee" : sound, frequency: 1, origin: 0, startWord: 1, midWord: 1, endWord: 1 };
      graphemeMaps[position].set(sound, [glyph]);
      graphemes.push(glyph);
    }
  }
  const onsets: [number, number][] = [[onset ? 1 : 0, 1]];
  const codas: [number, number][] = [[coda ? 1 : 0, 1]];
  const template = prefix ? suffix ? "both" : "prefixed" : "suffixed";
  const weights = { bare: 0, prefixed: 0, suffixed: 0, both: 0, [template]: 1 };
  const neutral = (affix: Affix): Affix => ({ ...affix, stressEffect: "none", boundaryTransforms: [], morphophonemicRules: [] });
  const config: LanguageConfig = {
    ...englishConfig, phonemeMaps, graphemeMaps, graphemes,
    clusterConstraint: undefined, clusterWeights: undefined,
    clusterLimits: { maxOnset: 1, maxCoda: 1 }, codaConstraints: { allowedFinal: coda ? [coda] : [] },
    syllableStructure: { ...englishConfig.syllableStructure, maxOnsetLength: 1, maxCodaLength: 1, letterLengthTargets: undefined },
    phonemeLengthWeights: { text: [[target, 1]], lexicon: [[target, 1]] },
    generationWeights: {
      ...englishConfig.generationWeights,
      onsetLength: { monosyllabic: onsets, followingNucleus: onsets, default: onsets, long: onsets },
      codaLength: { monosyllabic: { 1: codas }, monosyllabicDefault: codas, polysyllabicNonzero: codas, zeroWeightEndOfWord: coda ? 0 : 1, zeroWeightMidWord: coda ? 0 : 1 },
      probability: { ...englishConfig.generationWeights.probability, finalS: 0, nasalStopExtension: 0 },
    },
    pronunciation: {
      ...englishConfig.pronunciation,
      aspiration: { enabled: false, targets: [{ segment: "onset" }], rules: [{ id: "disabled", when: {}, probability: 0 }], fallbackProbability: 0 },
      vowelReduction: { enabled: false, rules: [], reduceSecondaryStress: false },
    },
    morphology: { ...englishConfig.morphology!, boundaryPolicy: policy, prefixes: prefix ? [neutral(prefix)] : [], suffixes: suffix ? [neutral(suffix)] : [], templateWeights: { text: weights, lexicon: weights } },
    doubling: undefined, silentE: undefined, spellingRules: [], gapSpellings: [],
  };
  const generator = createGenerator(config);
  return generator.generateWord({ seed: 13, trace: true, morphology: true, syllableCount: 1 });
}

const decisions = (word: Word) => word.trace!.structural.filter((event): event is MorphHiatusDecisionTrace => event.event === "morphHiatusDecision");

describe("morphological vowel adjacency", () => {
  it("inserts an unspelled bridge only under the legacy insertion policy", () => {
    const legacyPolicy = { enablePrefixRootFallback: true, enableRootSuffixFallback: true, fallbackBridgeOnsets: [["h", 100]] as [string, number][] };
    const legacyGenerator = createGenerator({ ...englishConfig, morphology: { ...englishConfig.morphology!, boundaryPolicy: legacyPolicy } });
    const rand = createSeededRng(3);
    const legacy = Array.from({ length: 400 }, () => legacyGenerator.generateWord({ rand, trace: true, morphology: true }));
    const inserted = legacy.flatMap(word => decisions(word).filter(event => event.outcome === "inserted").map(event => ({ word, event })));
    expect(inserted.length).toBeGreaterThan(0);
    for (const { word, event } of inserted) {
      expect(event.inserted).toBe("h");
      expect(word.syllables[event.rightSyllableIndex].onset[0].sound).toBe("h");
    }
    // The affix supplies the written form, so at least one inserted /h/ has no written h.
    expect(inserted.some(({ word }) => !word.written.clean.includes("h"))).toBe(true);

    const english = generateWords(400, { seed: 3, trace: true, morphology: true });
    const fallbackEvents = english.flatMap(word => word.trace!.structural)
      .filter(event => event.event === "morphPrefixHiatusFallback" || event.event === "morphSuffixHiatusFallback");
    expect(fallbackEvents).toEqual([]);
    const preserved = english.flatMap(decisions);
    expect(preserved.length).toBeGreaterThan(0);
    expect(preserved.every(event => event.outcome === "preserved" && !event.fallbackEnabled)).toBe(true);
  });

  it.each([
    [{ prefix: "re" }, ["prefix-root"]],
    [{ suffix: "ing" }, ["root-suffix"]],
    [{ prefix: "re", suffix: "ing" }, ["prefix-root", "root-suffix"]],
  ] as const)("preserves both vowel nuclei across %j", (options, boundaries) => {
    const word = fixedBoundary(options);
    expect(decisions(word).map(event => event.boundary)).toEqual(boundaries);
    for (const event of decisions(word)) {
      expect(event.outcome).toBe("preserved");
      expect(word.syllables[event.leftSyllableIndex].coda).toEqual([]);
      expect(word.syllables[event.rightSyllableIndex].onset).toEqual([]);
      expect(word.syllables[event.leftSyllableIndex].nucleus.length).toBeGreaterThan(0);
      expect(word.syllables[event.rightSyllableIndex].nucleus.length).toBeGreaterThan(0);
    }
  });

  it.each([
    { prefix: "re", onset: "h" }, { suffix: "ing", coda: "t" },
    { prefix: "un" }, { suffix: "ness" },
  ])("keeps consonants and does not report hiatus for %j", options => {
    const word = fixedBoundary(options);
    expect(decisions(word)).toEqual([]);
    if (options.onset === "h") expect(word.syllables[1].onset[0].sound).toBe("h");
  });

  it.each(["h", "j", "w"])("retains explicitly enabled custom /%s/ insertion", sound => {
    const word = fixedBoundary({ prefix: "re", suffix: "ing", policy: { enablePrefixRootFallback: true, enableRootSuffixFallback: true, fallbackBridgeOnsets: [[sound, 100]] } });
    expect(decisions(word)).toHaveLength(2);
    for (const event of decisions(word)) {
      expect(event).toMatchObject({ outcome: "inserted", fallbackEnabled: true, inserted: sound });
      expect(word.syllables[event.rightSyllableIndex].onset[0].sound).toBe(sound);
    }
    expect(word.trace!.structural.filter(event => event.event === "morphPrefixHiatusFallback" || event.event === "morphSuffixHiatusFallback")).toHaveLength(2);
  });

  it("reports an enabled fallback with no usable bridge separately", () => {
    const word = fixedBoundary({ suffix: "ing", policy: { enableRootSuffixFallback: true, fallbackBridgeOnsets: [] } });
    expect(decisions(word)).toMatchObject([{ outcome: "no-bridge-candidate", fallbackEnabled: true }]);
    expect(word.syllables[1].onset).toEqual([]);
  });

  it("preserves legacy omitted-policy behavior for custom configs", () => {
    expect(decisions(fixedBoundary({ suffix: "ing", policy: {} }))).toMatchObject([{ outcome: "inserted", inserted: "h" }]);
  });

  it("keeps tracing observational across a continuous public-API stream", () => {
    const first = createSeededRng(20260926);
    const second = createSeededRng(20260926);
    let firstCalls = 0;
    let secondCalls = 0;
    const tracedRand = () => { firstCalls++; return first(); };
    const plainRand = () => { secondCalls++; return second(); };
    for (let i = 0; i < 2000; i++) {
      const traced = generateWord({ rand: tracedRand, trace: true });
      const plain = generateWord({ rand: plainRand });
      expect({ ...traced, trace: undefined }).toEqual(plain);
    }
    expect(firstCalls).toBe(secondCalls);
    expect(first()).toBe(second());
  });
});

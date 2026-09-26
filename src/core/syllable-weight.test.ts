import { describe, expect, it } from "vitest";
import { analyzeWordWeight, createGenerator, createSeededRng, englishConfig, generateWord } from "../index.js";
import type { LanguageConfig, NuclearQuantity, OTConstraint, SyllableWeightPolicy } from "../index.js";
import type { PrimaryStressRules } from "../config/language.js";
import type { Phoneme, Syllable } from "../types.js";

const moraic: SyllableWeightPolicy = { type: "moraic", analysis: "fixture", coda: "weight-by-position", unknown: "legacy-segment-count" };

function configFor(options: { policy?: SyllableWeightPolicy; primary?: PrimaryStressRules; quantities?: boolean | "english"; secondary?: boolean } = {}): LanguageConfig {
  const phones = englishConfig.phonemes.map(phone => {
    let nuclearQuantity: NuclearQuantity | undefined;
    if (options.quantities === "english") nuclearQuantity = phone.nuclearQuantity && { ...phone.nuclearQuantity };
    else if (options.quantities && phone.nucleus) nuclearQuantity = { analysis: "fixture", moras: phone.sound === "aɪ" ? 2 : 1 };
    return { ...phone, nuclearQuantity };
  });
  const bySound = new Map(phones.map(phone => [phone.sound, phone]));
  const onset = bySound.get("b")!;
  const light = bySound.get("ɪ")!;
  const heavy = bySound.get("aɪ")!;
  const fixedOnset: [number, number][] = [[1, 1]];
  const noCoda: [number, number][] = [[0, 1]];
  return {
    ...englishConfig,
    phonemes: phones,
    phonemeMaps: { onset: new Map([["b", [onset]]]), nucleus: new Map([["ɪ", [light]], ["aɪ", [heavy]]]), coda: new Map() },
    clusterConstraint: undefined, clusterWeights: undefined, codaConstraints: undefined,
    clusterLimits: { maxOnset: 1, maxCoda: 0 },
    syllableStructure: { ...englishConfig.syllableStructure, maxOnsetLength: 1, maxCodaLength: 0, letterLengthTargets: undefined },
    phonemeLengthWeights: { text: [[6, 1]], lexicon: [[6, 1]] },
    generationWeights: {
      ...englishConfig.generationWeights,
      onsetLength: { monosyllabic: fixedOnset, followingNucleus: fixedOnset, default: fixedOnset, long: fixedOnset },
      codaLength: { monosyllabic: { 1: noCoda }, monosyllabicDefault: noCoda, polysyllabicNonzero: noCoda, zeroWeightEndOfWord: 1, zeroWeightMidWord: 1 },
      probability: { ...englishConfig.generationWeights.probability, finalS: 0, nasalStopExtension: 0 },
    },
    pronunciation: {
      ...englishConfig.pronunciation,
      stress: {
        ...englishConfig.pronunciation.stress,
        syllableWeight: options.policy,
        primary: options.primary ?? { type: "ot", otConfig: { constraints: [{ name: "WSP", weight: 100 }], noise: 0 } },
        secondary: { ...englishConfig.pronunciation.stress.secondary, enabled: options.secondary ?? false, probability: 100, candidateWindow: "all-nonprimary" },
        rhythmic: { ...englishConfig.pronunciation.stress.rhythmic, enabled: false },
        nucleus: {},
      },
      vowelReduction: { enabled: false, rules: [], reduceSecondaryStress: false },
      aspiration: { enabled: false, targets: [{ segment: "onset" }], rules: [{ id: "disabled", when: {}, probability: 0 }], fallbackProbability: 0 },
    },
    doubling: undefined, silentE: undefined, gapSpellings: [], spellingRules: [],
  };
}

const generate = (config: LanguageConfig, seed = 9) => createGenerator(config).generateWord({ seed, syllableCount: 3, morphology: false, trace: true });

describe("shared analytical and operational syllable weight", () => {
  it("keeps unspecified custom quantities unknown under the legacy fallback", () => {
    const word = generate(configFor(), 404);
    const observation = word.trace!.stressWeight!;
    expect(observation.policy).toEqual({ type: "legacy-segment-count" });
    expect(observation.domain).toBe("root-before-nucleus-repair");
    const before = word.trace!.stages.find(stage => stage.name === "applyStress")!.before;
    for (const [index, syllable] of observation.syllables.entries()) {
      expect(syllable.nucleusMoras).toBeNull();
      expect(syllable.analytical.weight).toBe("unknown");
      expect(syllable.nucleus.every(phone => phone.quantity.status === "unknown" && phone.quantity.reason === "unspecified")).toBe(true);
      expect(syllable.operational).toEqual({ weight: before[index].coda.length || before[index].nucleus.length > 1 ? "heavy" : "light", basis: "legacy-rule" });
    }
  });

  it("declares only the eleven partial English quantities without inferring tense or ambiguous vowels", () => {
    const policy = englishConfig.pronunciation.stress.syllableWeight!;
    expect(policy).toEqual({ type: "moraic", analysis: "english-legacy-partial-quantity-v1", coda: "weight-by-position", unknown: "legacy-segment-count" });
    const one = ["ɪ", "ɛ", "æ", "ʊ", "ʌ", "ə"];
    const two = ["eɪ", "aɪ", "əʊ", "ɔɪ", "aʊ"];
    const unknown = ["i:", "u", "ɑ", "ɔ", "ɚ", "ɜ"];
    const vowels = englishConfig.phonemes.filter(phone => phone.nucleus);
    expect(vowels.map(phone => phone.sound).sort()).toEqual([...one, ...two, ...unknown].sort());
    const open = analyzeWordWeight(vowels.map(phone => ({ onset: [], nucleus: [phone], coda: [] })), policy);
    for (const analysis of open) {
      const sound = analysis.nucleus[0].sound;
      if (unknown.includes(sound)) {
        expect(analysis.nucleusMoras).toBeNull();
        expect(analysis.nucleus[0].declared).toBeUndefined();
        expect(analysis.analytical.weight).toBe("unknown");
        expect(analysis.operational).toEqual({ weight: "light", basis: "legacy-fallback" });
      } else {
        expect(analysis.nucleusMoras).toBe(two.includes(sound) ? 2 : 1);
        expect(analysis.operational.weight).toBe(two.includes(sound) ? "heavy" : "light");
      }
    }
    const coda = englishConfig.phonemes.find(phone => phone.sound === "t")!;
    const closed = analyzeWordWeight(vowels.map(phone => ({ onset: [], nucleus: [phone], coda: [coda] })), policy);
    expect(closed.every(analysis => analysis.analytical.weight === "heavy")).toBe(true);
    expect(englishConfig.phonemes.find(phone => phone.sound === "ʊ")!.tense).toBe(true);
    expect(new Set(vowels.flatMap(phone => phone.nuclearQuantity ? [phone.nuclearQuantity] : [])).size).toBe(11);
  });

  it("uses default English quantity for controlled OT, alternate primary and secondary decisions", () => {
    const policy = englishConfig.pronunciation.stress.syllableWeight;
    const alternate: PrimaryStressRules = { type: "weight-sensitive", disyllabicWeights: [1, 0], polysyllabicWeights: { heavyPenult: 1, lightPenult: 0, antepenultHeavy: 0, antepenultLight: 1, initial: 0 } };
    const ot = createGenerator(configFor({ policy, quantities: "english", secondary: true }));
    const other = createGenerator(configFor({ policy, quantities: "english", primary: alternate, secondary: true }));
    let noninitialHeavy = 0;
    for (let seed = 0; seed < 100; seed++) {
      const options = { seed, syllableCount: 3, morphology: false, trace: true };
      const trace = ot.generateWord(options).trace!.stressWeight!;
      const firstHeavy = trace.syllables.findIndex(s => s.nucleus[0].sound === "aɪ");
      expect(trace.primary.selectedIndex).toBe(firstHeavy < 0 ? 0 : firstHeavy);
      if (firstHeavy > 0) noninitialHeavy++;
      const alternative = other.generateWord(options).trace!.stressWeight!;
      expect(alternative.primary.selectedIndex).toBe(alternative.syllables[1].nucleus[0].sound === "aɪ" ? 1 : 0);
      for (const evidence of [trace, alternative]) {
        for (const candidate of evidence.secondary.candidates) {
          expect(candidate.weight).toBe(evidence.syllables[candidate.syllableIndex].nucleus[0].sound === "aɪ" ? 70 : 30);
        }
      }
    }
    expect(noninitialHeavy).toBeGreaterThan(5);
  });

  it("classifies every sampled open diphthong as heavy without changing other operational cases", () => {
    const rand = createSeededRng(771901);
    let openDiphthongs = 0;
    let fallbackUnknowns = 0;
    for (let draw = 0; draw < 2000; draw++) {
      const word = generateWord({ rand, trace: true });
      for (const syllable of word.trace!.stressWeight!.syllables) {
        const diphthong = syllable.nucleus.length === 1 && ["eɪ", "aɪ", "əʊ", "ɔɪ", "aʊ"].includes(syllable.nucleus[0].sound);
        const heavy = syllable.coda.length > 0 || syllable.nucleus.length > 1 || diphthong;
        expect(syllable.operational.weight).toBe(heavy ? "heavy" : "light");
        if (diphthong && syllable.coda.length === 0) openDiphthongs++;
        if (syllable.operational.basis === "legacy-fallback") fallbackUnknowns++;
      }
    }
    expect(openDiphthongs).toBeGreaterThan(50);
    expect(fallbackUnknowns).toBeGreaterThan(50);
  });

  it("keeps active-model tracing observational for complete outputs and random draws", () => {
    const rngs = [createSeededRng(917), createSeededRng(917)];
    const calls = [0, 0];
    for (let draw = 0; draw < 500; draw++) {
      const words = rngs.map((rng, index) => generateWord({ rand: () => { calls[index]++; return rng(); }, trace: index === 0 }));
      delete words[0].trace;
      expect(words[0]).toEqual(words[1]);
      expect(calls[0]).toBe(calls[1]);
    }
    expect(rngs[0]()).toBe(rngs[1]());
  });

  it("uses atomic diphthong quantity for opt-in OT while explicit legacy stays unchanged", () => {
    const enabled = createGenerator(configFor({ policy: moraic, quantities: true }));
    const legacy = createGenerator(configFor({ policy: { type: "legacy-segment-count" }, quantities: true }));
    let noninitialHeavy = 0;
    for (let seed = 0; seed < 100; seed++) {
      const options = { seed, syllableCount: 3, morphology: false, trace: true };
      const word = enabled.generateWord(options);
      const trace = word.trace!.stressWeight!;
      const firstHeavy = trace.syllables.findIndex(s => s.analytical.weight === "heavy");
      expect(trace.primary.selectedIndex).toBe(firstHeavy < 0 ? 0 : firstHeavy);
      if (firstHeavy > 0) noninitialHeavy++;
      const old = legacy.generateWord(options);
      expect(old.trace!.stressWeight!.primary.selectedIndex).toBe(0);
      expect(old.trace!.stressWeight!.syllables.every(s => s.operational.weight === "light")).toBe(true);
    }
    expect(noninitialHeavy).toBeGreaterThan(5);
  });

  it("uses the same analysis for alternative primary weighting and secondary candidates", () => {
    const primary: PrimaryStressRules = { type: "weight-sensitive", disyllabicWeights: [1, 0], polysyllabicWeights: { heavyPenult: 1, lightPenult: 0, antepenultHeavy: 0, antepenultLight: 1, initial: 0 } };
    const generator = createGenerator(configFor({ policy: moraic, quantities: true, primary, secondary: true }));
    for (let seed = 0; seed < 100; seed++) {
      const word = generator.generateWord({ seed, syllableCount: 3, morphology: false, trace: true });
      const trace = word.trace!.stressWeight!;
      expect(trace.primary.selectedIndex).toBe(trace.syllables[1].analytical.weight === "heavy" ? 1 : 0);
      expect(trace.secondary.candidates.map(candidate => candidate.syllableIndex)).toEqual([0, 1, 2].filter(index => index !== trace.primary.selectedIndex));
      for (const candidate of trace.secondary.candidates) expect(candidate.weight).toBe(trace.syllables[candidate.syllableIndex].operational.weight === "heavy" ? 70 : 30);
      expect(trace.secondary.applied).toBe(true);
    }
  });

  it("selects heavy secondary candidates at the configured rate in a controlled model", () => {
    const generator = createGenerator(configFor({ policy: moraic, quantities: true, primary: { type: "fixed", fixedPosition: 2 }, secondary: true }));
    const rand = createSeededRng(10871);
    let mixedPairs = 0;
    let heavySelections = 0;
    for (let draw = 0; draw < 3000; draw++) {
      const word = generator.generateWord({ rand, syllableCount: 3, morphology: false, trace: true });
      const trace = word.trace!.stressWeight!;
      const weights = trace.secondary.candidates.map(candidate => trace.syllables[candidate.syllableIndex].operational.weight);
      if (weights[0] === weights[1]) continue;
      mixedPairs++;
      if (trace.syllables[trace.secondary.selectedIndex!].operational.weight === "heavy") heavySelections++;
    }
    expect(mixedPairs).toBeGreaterThan(300);
    const expectedRate = 0.7;
    const standardError = Math.sqrt(expectedRate * (1 - expectedRate) / mixedPairs);
    expect(Math.abs(heavySelections / mixedPairs - expectedRate)).toBeLessThan(5 * standardError);
  });

  it.each([
    [{ type: "fixed", fixedPosition: 2 }, 2], [{ type: "initial" }, 0], [{ type: "penultimate" }, 1],
  ] as const)("reports fixed strategy %j with the same weight evidence", (primary, expected) => {
    const word = generate(configFor({ policy: moraic, quantities: true, primary }));
    expect(word.trace!.stressWeight!.primary).toEqual({ strategy: primary.type, selectedIndex: expected });
    expect(word.trace!.stressWeight!.syllables.every(s => s.nucleusMoras !== null)).toBe(true);
  });

  it("does not infer quantity from tense or the length of custom sound symbols", () => {
    const config = configFor({ policy: moraic, quantities: true });
    for (const phone of config.phonemes) {
      if (phone.sound === "aɪ") phone.tense = false;
      if (phone.sound === "ɪ") phone.tense = true;
    }
    const word = generate(config);
    for (const s of word.trace!.stressWeight!.syllables) expect(s.nucleusMoras).toBe(s.nucleus[0].sound === "aɪ" ? 2 : 1);
    const syllables = structuredClone(word.syllables);
    syllables[0].nucleus[0].sound = "custom-long-symbol";
    syllables[0].nucleus[0].nuclearQuantity = { analysis: "fixture", moras: 1 };
    expect(analyzeWordWeight(syllables, moraic)[0].analytical.weight).toBe("light");
  });

  it("handles unspecified and mismatched metadata through the declared fallback or error", () => {
    const config = configFor({ policy: moraic });
    const trace = generate(config).trace!.stressWeight!;
    expect(trace.syllables.every(s => s.analytical.weight === "unknown" && s.operational.basis === "legacy-fallback")).toBe(true);
    config.pronunciation.stress.syllableWeight = { ...moraic, unknown: "error" };
    expect(() => generate(config)).toThrow(/Unknown syllable weight/);
    const mismatched = configFor({ policy: moraic, quantities: true });
    for (const phone of mismatched.phonemes) if (phone.nuclearQuantity) phone.nuclearQuantity.analysis = "other";
    expect(generate(mismatched).trace!.stressWeight!.syllables.every(s => s.nucleus[0].quantity.status === "unknown" && s.nucleus[0].quantity.reason === "model-mismatch")).toBe(true);
  });

  it("analyses multi-element, empty and closed nuclei without inventing exact moras", () => {
    const word = generate(configFor({ policy: moraic, quantities: true }));
    const one = { ...word.syllables[0].nucleus[0], nuclearQuantity: { analysis: "fixture", moras: 1 } as NuclearQuantity };
    const unknown = { ...one, nuclearQuantity: undefined };
    const consonant = word.syllables[0].onset[0];
    const shape = (nucleus: Phoneme[], coda: Phoneme[] = []): Syllable => ({ onset: [], nucleus, coda });
    const analysis = analyzeWordWeight([shape([one, one]), shape([unknown], [consonant]), shape([]), shape([unknown, unknown])], moraic);
    expect(analysis.map(s => [s.nucleusMoras, s.analytical.weight, s.operational.weight])).toEqual([[2, "heavy", "heavy"], [null, "heavy", "heavy"], [null, "unknown", "light"], [null, "unknown", "heavy"]]);
    expect(analyzeWordWeight([shape([unknown], [consonant])], { ...moraic, unknown: "error" })[0].analytical.basis).toBe("weight-by-position");
    expect(analyzeWordWeight([shape([one], [consonant])], { ...moraic, coda: "nonmoraic" })[0].analytical.weight).toBe("light");
    const two = { ...one, nuclearQuantity: { analysis: "fixture", moras: 2 } as NuclearQuantity };
    const partial = analyzeWordWeight([shape([two, unknown]), shape([one, unknown])], moraic);
    expect(partial.map(s => [s.nucleusMoras, s.analytical.weight])).toEqual([[null, "heavy"], [null, "unknown"]]);
  });

  it("detaches quantity and policy observations from config, surface phones and future traces", () => {
    const config = configFor({ policy: { ...moraic }, quantities: true });
    const generator = createGenerator(config);
    const word = generator.generateWord({ seed: 9, syllableCount: 3, morphology: false, trace: true });
    const before = structuredClone(word.trace!.stressWeight);
    const surfaceQuantity = word.syllables[0].nucleus[0].nuclearQuantity!;
    surfaceQuantity.moras = surfaceQuantity.moras === 1 ? 2 : 1;
    config.phonemes.find(p => p.sound === "ɪ")!.nuclearQuantity!.analysis = "changed";
    const policy = config.pronunciation.stress.syllableWeight!;
    if (policy.type === "moraic") policy.analysis = "changed";
    expect(word.trace!.stressWeight).toEqual(before);
    const next = generator.generateWord({ seed: 10, syllableCount: 3, morphology: false, trace: true });
    next.trace!.stressWeight!.syllables[0].nucleus[0].declared!.analysis = "trace-edit";
    expect(word.trace!.stressWeight).toEqual(before);
  });

  it("keeps legacy omission and explicit policy, tracing and RNG in exact agreement", () => {
    const configs = [configFor({ secondary: true }), configFor({ policy: { type: "legacy-segment-count" }, secondary: true })];
    const generators = configs.map(createGenerator);
    const rngs = [createSeededRng(281), createSeededRng(281)];
    const calls = [0, 0];
    for (let draw = 0; draw < 200; draw++) {
      const words = generators.map((generator, index) => generator.generateWord({ rand: () => { calls[index]++; return rngs[index](); }, syllableCount: 3, morphology: false, trace: index === 0 }));
      delete words[0].trace;
      expect(words[0]).toEqual(words[1]);
      expect(calls[0]).toBe(calls[1]);
    }
    expect(rngs[0]()).toBe(rngs[1]());
  });

  it("accepts existing two-argument OT constraint implementations", () => {
    const custom: OTConstraint = { name: "fixture", evaluate: (_syllables, index) => index };
    const word = generateWord({ seed: 404, trace: true });
    expect(custom.evaluate(word.syllables, 1, word.trace!.stressWeight!.syllables)).toBe(1);
  });

  it.each([null, {}, { analysis: "fixture", moras: 0 }, { analysis: "fixture", moras: 3 }, { analysis: "", moras: 1 }])("rejects malformed quantity %j through the public generator", quantity => {
    const config = configFor();
    config.phonemes[0].nuclearQuantity = quantity as NuclearQuantity;
    expect(() => createGenerator(config)).toThrow(/nuclearQuantity/);
  });

  it("rejects distinct map objects before their quantity can bypass inventory validation", () => {
    const config = configFor();
    const phone = config.phonemeMaps.nucleus.get("ɪ")![0];
    config.phonemeMaps.nucleus.set("ɪ", [{ ...phone, nuclearQuantity: { analysis: "fixture", moras: 3 } as unknown as NuclearQuantity }]);
    expect(() => createGenerator(config)).toThrow(/not found in phonemes/);
  });

  it.each([null, { type: "missing" }, { type: "moraic", analysis: "", coda: "nonmoraic", unknown: "error" }, { type: "moraic", analysis: "fixture", coda: "wrong", unknown: "error" }])("rejects malformed weight policy %j", policy => {
    const config = configFor();
    config.pronunciation.stress.syllableWeight = policy as SyllableWeightPolicy;
    expect(() => createGenerator(config)).toThrow(/syllableWeight/);
  });
});

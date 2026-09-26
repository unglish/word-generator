import { describe, expect, it, vi } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord, TraceCollector } from "../index.js";
import type { LanguageConfig } from "../config/language.js";
import type { Phoneme, Syllable, WordGenerationContext } from "../types.js";
import { assertRootRimeCompatibility, isNucleusCodaPairAllowed, isNucleusCompatibleWithCoda } from "./rime-compatibility.js";
import { repairStressedNuclei } from "./stress-repair.js";
import { repairNucleusWordPositions } from "./nucleus-position.js";

const phone = (sound: string): Phoneme => englishConfig.phonemes.find(p => p.sound === sound)!;
const schwa = { ...phone("ə"), nucleus: 1, startWord: 1, midWord: 1, endWord: 1 };
const rhotic = { ...phone("ɚ"), nucleus: 10, startWord: 0, midWord: 1, endWord: 0 };
const goose = { ...phone("u"), nucleus: 2, startWord: 0, midWord: 1, endWord: 0 };
const pairRules = [{ nucleus: ["ɚ"], coda: ["ŋ"] }];
const excluded = new Map([["ɚ", new Set(["ŋ"])]]);

function fixedRoot(nuclei: Phoneme[] = [schwa, rhotic, goose], syllables = 2): LanguageConfig {
  const target = 3 * syllables;
  const coda = { ...phone("ŋ"), startWord: 1, midWord: 1, endWord: 1 };
  const one: [number, number][] = [[1, 1]];
  return {
    ...englishConfig,
    phonemes: [...englishConfig.phonemes.filter(p => p.nucleus === undefined), ...nuclei, coda],
    phonemeMaps: {
      ...englishConfig.phonemeMaps,
      onset: new Map([["k", [phone("k")]]]),
      nucleus: new Map(nuclei.map(p => [p.sound, [p]])),
      coda: new Map([["ŋ", [coda]]]),
    },
    clusterConstraint: undefined,
    clusterLimits: { maxOnset: 1, maxCoda: 1 },
    clusterWeights: undefined,
    codaConstraints: { allowedFinal: ["ŋ"], bannedNucleusCodaCombinations: pairRules },
    gapSpellings: [], morphology: undefined,
    syllableStructure: { maxOnsetLength: 1, maxNucleusLength: 1, maxCodaLength: 1 },
    phonemeLengthWeights: { text: [[target, 1]], lexicon: [[target, 1]] },
    phonemeToSyllableWeights: { text: { [target]: [[syllables, 1]] }, lexicon: { [target]: [[syllables, 1]] } },
    generationWeights: {
      ...englishConfig.generationWeights,
      onsetLength: { monosyllabic: one, followingNucleus: one, default: one, long: one },
      codaLength: { monosyllabic: {}, monosyllabicDefault: one, polysyllabicNonzero: one, zeroWeightEndOfWord: 0, zeroWeightMidWord: 0 },
      probability: { ...englishConfig.generationWeights.probability, finalS: 0, nasalStopExtension: 0 },
      boundaryPolicy: { equalSonorityDrop: 0, risingCodaDrop: 0 },
    },
    pronunciation: {
      ...englishConfig.pronunciation, vowelReduction: undefined,
      aspiration: { enabled: false, targets: [{ segment: "onset" }], rules: [{ id: "off", when: {}, probability: 0 }], fallbackProbability: 0 },
      stress: { ...englishConfig.pronunciation.stress, primary: { type: "fixed", fixedPosition: 0 } },
    },
  };
}
function shape(nucleus: Phoneme[], coda: Phoneme[] = [phone("ŋ")]): Syllable {
  return { onset: [phone("k")], nucleus, coda, stress: "ˈ" };
}
// Hand-built repair inputs exercise multi-segment contracts; they are not generated words.
function repairContext(syllables: Syllable[], rand = vi.fn(() => 0)): WordGenerationContext {
  return { syllableCount: syllables.length, currSyllableIndex: 0, rand, trace: new TraceCollector(),
    word: { syllables, written: { clean: "", hyphenated: "" }, pronunciation: "" } };
}
const stress = englishConfig.pronunciation.stress;

describe("lexical-root nucleus/coda compatibility", () => {
  it("checks any nucleus and any coda segment, including nonfirst segments", () => {
    expect(isNucleusCodaPairAllowed("ɚ", "ŋ", excluded)).toBe(false);
    expect(isNucleusCompatibleWithCoda("ɚ", [phone("k"), phone("ŋ")], excluded)).toBe(false);
    const syllables = [shape([goose, rhotic], [phone("k"), phone("ŋ")])];
    expect(() => assertRootRimeCompatibility(syllables, excluded)).toThrow(/nucleus 1, coda 1/);
    expect(() => assertRootRimeCompatibility(syllables)).not.toThrow();
    expect(() => assertRootRimeCompatibility([shape([rhotic], [])], excluded)).not.toThrow();
  });

  it("preserves a retained coda during public stress repair and records excluded candidates", () => {
    const word = createGenerator(fixedRoot()).generateWord({ seed: 17, syllableCount: 2, morphology: false, trace: true });
    const stage = word.trace!.stages.find(item => item.name === "repairStressedNuclei")!;
    expect(stage.before).toEqual([{ onset: ["k"], nucleus: ["ə"], coda: ["ŋ"] }, { onset: ["k"], nucleus: ["ə"], coda: ["ŋ"] }]);
    expect(stage.after[0]).toEqual({ onset: ["k"], nucleus: ["u"], coda: ["ŋ"] });
    expect(word.trace!.repairs.find(repair => repair.rule === "repairStressedNuclei")!.nucleusReplacement).toEqual({
      domain: "lexical-root", syllableIndex: 0, nucleusIndex: 0, coda: ["ŋ"],
      edges: { initial: false, final: false }, weighting: "nucleus-only",
      eligibleCandidateEntries: 1, positivePairExclusions: 1, totalWeight: 2,
    });
  });

  it("honors custom exclusions without silently imposing default English pair bans", () => {
    const config = fixedRoot();
    config.codaConstraints!.bannedNucleusCodaCombinations = [{ nucleus: ["u"], coda: ["ŋ"] }];
    const word = createGenerator(config).generateWord({ seed: 17, syllableCount: 2, morphology: false, trace: true });
    expect(word.syllables[0].nucleus[0].sound).toBe("ɚ");
    expect(word.syllables[0].coda.map(p => p.sound)).toEqual(["ŋ"]);
  });

  it("keeps the assertion scoped before custom surface reduction", () => {
    const config = fixedRoot();
    config.pronunciation.vowelReduction = { enabled: true, reduceSecondaryStress: true, rules: [{ source: "ə", target: "ɚ", probability: 100 }] };
    const word = createGenerator(config).generateWord({ seed: 17, syllableCount: 2, morphology: false, trace: true });
    const prepared = word.trace!.stages.find(stage => stage.name === "generateWrittenForm")!.before;
    expect(prepared[1]).toEqual({ onset: ["k"], nucleus: ["ə"], coda: ["ŋ"] });
    expect(word.syllables[1].nucleus[0].sound).toBe("ɚ");
    expect(word.syllables[1].coda.map(p => p.sound)).toEqual(["ŋ"]);
  });

  it("filters a hand-built exposed edge while preserving its retained coda", () => {
    const source = { ...schwa, nucleusWordPosition: { initial: 0, medial: 1, final: 0 } };
    const alternatives = [rhotic, goose].map(p => ({ ...p, nucleusWordPosition: { initial: 3, medial: 0, final: 0 } }));
    const context = repairContext([{ onset: [], nucleus: [source], coda: [phone("ŋ")] }]);
    repairNucleusWordPositions(context, [source, ...alternatives], stress, excluded);
    expect(context.word.syllables[0].nucleus[0].sound).toBe("u");
    expect(context.word.syllables[0].coda.map(p => p.sound)).toEqual(["ŋ"]);
    expect(context.trace!.repairs[0].nucleusReplacement).toEqual({
      domain: "lexical-root", syllableIndex: 0, nucleusIndex: 0, coda: ["ŋ"],
      edges: { initial: true, final: false }, weighting: "nucleus-times-word-position",
      eligibleCandidateEntries: 1, positivePairExclusions: 1, totalWeight: 6,
    });
    expect(context.rand).toHaveBeenCalledTimes(1);
  });

  it.each([[], [rhotic], [{ ...goose, nucleus: 0 }], [{ ...goose, nucleus: -1 }], [{ ...goose, nucleus: Infinity }], [{ ...goose, nucleus: NaN }]].map(alternatives => ({ alternatives })))(
    "throws only when the first-nucleus stress repair is invoked with no finite positive eligible pool: $alternatives", ({ alternatives }) => {
      const config = fixedRoot([schwa, ...alternatives]);
      expect(() => createGenerator(config).generateWord({ seed: 17, syllableCount: 2, morphology: false })).toThrow(/No eligible stressed nucleus/);
      expect(() => createGenerator(fixedRoot([schwa, ...alternatives], 1)).generateWord({ seed: 17, syllableCount: 1, morphology: false })).not.toThrow();
      const context = repairContext([shape([schwa])]);
      expect(() => repairStressedNuclei(context, [schwa, ...alternatives], stress, excluded)).toThrow(/No eligible stressed nucleus/);
      expect(context.rand).not.toHaveBeenCalled();
    });

  it("keeps stress repair's nucleus-only relative weights and one selection draw", () => {
    for (const [roll, expected] of [[0.24, "u"], [0.25, "ɑ"]] as const) {
      const context = repairContext([shape([schwa])], vi.fn(() => roll));
      const pool = [rhotic, { ...goose, nucleus: 1 }, { ...phone("ɑ"), nucleus: 3, startWord: 500 }];
      repairStressedNuclei(context, pool, stress, excluded);
      expect(context.word.syllables[0].nucleus[0].sound).toBe(expected);
      expect(context.rand).toHaveBeenCalledTimes(1);
      expect(context.trace!.repairs[0].nucleusReplacement).toMatchObject({ eligibleCandidateEntries: 2, totalWeight: 4, positivePairExclusions: 1 });
    }
  });

  it("rejects overflowing total weight before a stress selection draw", () => {
    const context = repairContext([shape([schwa])]);
    const pool = [{ ...goose, nucleus: Number.MAX_VALUE }, { ...phone("ɑ"), nucleus: Number.MAX_VALUE }];
    expect(() => repairStressedNuclei(context, pool, stress, excluded)).toThrow(/finite positive weight/);
    expect(context.rand).not.toHaveBeenCalled();
  });

  it("does not count zero-weight pair exclusions as positive candidates", () => {
    const context = repairContext([shape([schwa])]);
    repairStressedNuclei(context, [{ ...rhotic, nucleus: 0 }, goose], stress, excluded);
    expect(context.trace!.repairs[0].nucleusReplacement).toMatchObject({ positivePairExclusions: 0, totalWeight: 2 });
  });

  it("does not broaden first-nucleus stress repair to a later banned stress nucleus", () => {
    const context = repairContext([shape([goose, schwa])]);
    repairStressedNuclei(context, [goose], stress, excluded);
    expect(context.word.syllables[0].nucleus).toEqual([goose, schwa]);
    expect(context.rand).not.toHaveBeenCalled();
  });

  it("validates each edge replacement against the coda without another nucleus blocking the pool", () => {
    const invalid = { ...rhotic, nucleusWordPosition: { initial: 1, medial: 0, final: 1 } };
    const allowed = { ...goose, nucleusWordPosition: { initial: 1, medial: 1, final: 1 } };
    const context = repairContext([shape([invalid, invalid])]);
    repairNucleusWordPositions(context, [invalid, allowed], stress, excluded);
    expect(context.word.syllables[0].nucleus.map(p => p.sound)).toEqual(["u", "u"]);
    expect(context.rand).toHaveBeenCalledTimes(2);
    expect(context.trace!.repairs.map(repair => repair.nucleusReplacement!.nucleusIndex)).toEqual([0, 1]);
    expect(() => assertRootRimeCompatibility(context.word.syllables, excluded)).not.toThrow();
  });

  it("throws before an edge selection draw if all positive candidates conflict with the coda", () => {
    const source = { ...schwa, nucleusWordPosition: { initial: 1, medial: 0, final: 1 } };
    const alternative = { ...rhotic, nucleusWordPosition: { initial: 1, medial: 1, final: 1 } };
    const context = repairContext([shape([source])]);
    expect(() => repairNucleusWordPositions(context, [source, alternative], stress, excluded)).toThrow(/No eligible nucleus/);
    expect(context.rand).not.toHaveBeenCalled();
  });

  it("detaches replacement snapshots from caller-owned arrays and objects", () => {
    const trace = new TraceCollector();
    const detail = { domain: "lexical-root" as const, syllableIndex: 0, nucleusIndex: 0, coda: ["ŋ"],
      edges: { initial: false, final: false }, weighting: "nucleus-only" as const,
      eligibleCandidateEntries: 1, positivePairExclusions: 1, totalWeight: 2 };
    trace.recordRepair("repairStressedNuclei", "ə", "u", undefined, detail);
    detail.coda[0] = "s"; detail.edges.initial = true;
    expect(trace.repairs[0].nucleusReplacement!.coda).toEqual(["ŋ"]);
    expect(trace.repairs[0].nucleusReplacement!.edges.initial).toBe(false);
  });

  it("preserves public outputs and RNG when an added configured pair is inapplicable", () => {
    const plainConfig = fixedRoot([schwa, goose]);
    plainConfig.codaConstraints!.bannedNucleusCodaCombinations = [];
    const constrainedConfig = fixedRoot([schwa, goose]);
    const plain = createGenerator(plainConfig), constrained = createGenerator(constrainedConfig);
    const first = createSeededRng(712), second = createSeededRng(712);
    let firstCalls = 0, secondCalls = 0;
    for (let i = 0; i < 100; i++) {
      expect(constrained.generateWord({ rand: () => { secondCalls++; return second(); }, syllableCount: 2, morphology: false }))
        .toEqual(plain.generateWord({ rand: () => { firstCalls++; return first(); }, syllableCount: 2, morphology: false }));
    }
    expect(secondCalls).toBe(firstCalls); expect(second()).toBe(first());
  });

  it.each([false, true])("preserves trace/no-trace output and RNG with morphology=%s", morphology => {
    const first = createSeededRng(1777), second = createSeededRng(1777);
    let firstCalls = 0, secondCalls = 0;
    for (let i = 0; i < 1000; i++) {
      const plain = generateWord({ rand: () => { firstCalls++; return first(); }, morphology });
      const { trace, ...traced } = generateWord({ rand: () => { secondCalls++; return second(); }, morphology, trace: true });
      expect(trace).toBeDefined(); expect(traced).toEqual(plain);
    }
    expect(secondCalls).toBe(firstCalls); expect(second()).toBe(first());
  });
});

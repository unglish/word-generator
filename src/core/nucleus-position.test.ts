import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord } from "../index.js";
import type { LanguageConfig } from "../config/language.js";
import type { Phoneme, Syllable } from "../types.js";
import { isNucleusWordPositionAllowed, nucleusWordEdges } from "./nucleus-position.js";

const foot = englishConfig.phonemes.find(p => p.sound === "ʊ")!;
const goose = englishConfig.phonemes.find(p => p.sound === "u")!;
const schwa = englishConfig.phonemes.find(p => p.sound === "ə")!;

function fixedShape(nuclei: Phoneme[], onset: number, coda: number, syllables = 1): LanguageConfig {
  const phonemes = [...englishConfig.phonemes.filter(p => p.nucleus === undefined), ...nuclei];
  const phonemeCount = (onset + 1 + coda) * syllables;
  const weights = englishConfig.generationWeights;
  const singleton = (length: number): [number, number][] => [[length, 1]];
  return {
    ...englishConfig,
    phonemes,
    phonemeMaps: { ...englishConfig.phonemeMaps, nucleus: new Map(nuclei.map(p => [p.sound, [p]])) },
    gapSpellings: [],
    morphology: undefined,
    syllableStructure: { ...englishConfig.syllableStructure, letterLengthTargets: undefined },
    phonemeLengthWeights: { text: [[phonemeCount, 1]], lexicon: [[phonemeCount, 1]] },
    phonemeToSyllableWeights: { text: { [phonemeCount]: [[syllables, 1]] }, lexicon: { [phonemeCount]: [[syllables, 1]] } },
    generationWeights: {
      ...weights,
      onsetLength: { monosyllabic: singleton(onset), followingNucleus: singleton(onset), default: singleton(onset), long: singleton(onset) },
      codaLength: { monosyllabic: {}, monosyllabicDefault: singleton(coda), polysyllabicNonzero: coda ? singleton(coda) : [], zeroWeightEndOfWord: coda ? 0 : 1, zeroWeightMidWord: coda ? 0 : 1 },
    },
    pronunciation: { ...englishConfig.pronunciation, vowelReduction: undefined },
  };
}

describe("literal nucleus edges", () => {
  it.each([
    { seed: 374, syllableCount: 1, spelling: "splungs" },
    { seed: 44, syllableCount: 2, spelling: "smipnuct" },
  ])("generates a closed final FOOT rime at seed $seed", ({ seed, syllableCount, spelling }) => {
    const word = generateWord({ seed, syllableCount, morphology: false, trace: true });
    expect(word.written.clean).toBe(spelling);
    expect(word.syllables.at(-1)!.nucleus[0].sound).toBe("ʊ");
    expect(word.syllables.at(-1)!.coda.length).toBeGreaterThan(0);
    const generated = word.trace!.stages.find(stage => stage.name === "generateSyllables")!;
    expect(generated.after.at(-1)!.nucleus).toEqual(["ʊ"]);
  });

  it("retains legacy custom endWord restrictions when the override is absent", () => {
    const legacyFoot = { ...foot, nucleusWordPosition: undefined, nucleus: 1_000_000 };
    const generator = createGenerator(fixedShape([legacyFoot, goose], 1, 1));
    for (let seed = 0; seed < 100; seed++) {
      expect(generator.generateWord({ seed, morphology: false }).syllables[0].nucleus[0].sound).toBe("u");
    }
  });

  it("overrides both legacy filtering and weighting for closed nuclei", () => {
    const explicit = { ...foot, startWord: 0, midWord: 0, endWord: 0 };
    const generator = createGenerator(fixedShape([explicit], 1, 1));
    for (let seed = 0; seed < 50; seed++) {
      const word = generator.generateWord({ seed, morphology: false });
      expect(word.syllables[0].nucleus[0].sound).toBe("ʊ");
      expect(word.syllables[0].coda.length).toBeGreaterThan(0);
    }
  });

  it("applies both edge restrictions to an isolated vowel and rejects an impossible pool", () => {
    const generator = createGenerator(fixedShape([foot, goose], 0, 0));
    for (let seed = 0; seed < 50; seed++) {
      const word = generator.generateWord({ seed, morphology: false });
      expect(word.syllables[0].nucleus[0].sound).toBe("u");
    }
    const impossible = createGenerator(fixedShape([foot], 0, 0));
    expect(() => impossible.generateWord({ seed: 1, morphology: false })).toThrow(/No eligible nucleus/);
  });

  it("repairs a newly exposed FOOT edge after the coda is removed", () => {
    const config = fixedShape([{ ...foot, nucleus: 1_000_000 }, goose], 1, 1);
    config.codaConstraints = { ...config.codaConstraints, allowedFinal: [] };
    const word = createGenerator(config).generateWord({ seed: 12, morphology: false, trace: true });
    const generated = word.trace!.stages.find(stage => stage.name === "generateSyllables")!;
    expect(generated.after[0].nucleus).toEqual(["ʊ"]);
    expect(generated.after[0].coda.length).toBeGreaterThan(0);
    expect(word.syllables[0].coda).toEqual([]);
    expect(word.syllables[0].nucleus[0].sound).toBe("u");
    expect(word.trace!.repairs).toContainEqual(expect.objectContaining({ rule: "repairNucleusWordPositions", before: "ʊ", after: "u" }));
  });

  it("keeps a stress-driven replacement from introducing final open FOOT", () => {
    const config = fixedShape([{ ...schwa, nucleus: 1_000_000 }, { ...foot, nucleus: 1_000_000 }, goose], 1, 0, 2);
    config.pronunciation = {
      ...config.pronunciation,
      stress: { ...englishConfig.pronunciation.stress, primary: { type: "fixed", fixedPosition: 1 } },
    };
    const word = createGenerator(config).generateWord({ seed: 17, syllableCount: 2, morphology: false, trace: true });
    expect(word.trace!.repairs).toContainEqual(expect.objectContaining({ rule: "repairStressedNuclei", before: "ə", after: "u" }));
    expect(word.syllables.at(-1)!.nucleus[0].sound).toBe("u");
  });

  it("does not silently extend the FOOT edge restriction to other legacy checked vowels", () => {
    const trap = englishConfig.phonemes.find(p => p.sound === "æ")!;
    const config = fixedShape([{ ...foot, nucleus: 1_000_000 }, trap], 1, 1);
    config.codaConstraints = { ...config.codaConstraints, allowedFinal: [] };
    const word = createGenerator(config).generateWord({ seed: 12, morphology: false, trace: true });
    expect(word.syllables[0].coda).toEqual([]);
    expect(word.syllables[0].nucleus[0].sound).toBe("æ");
    expect(word.trace!.repairs).toContainEqual(expect.objectContaining({ rule: "repairNucleusWordPositions", before: "ʊ", after: "æ" }));
  });

  it("checks individual edges in a multi-segment nucleus", () => {
    const syllable: Syllable = { onset: [], nucleus: [foot, goose], coda: [] };
    const first = nucleusWordEdges(syllable, 0, 1, 0);
    const last = nucleusWordEdges(syllable, 0, 1, 1);
    expect(first).toEqual({ initial: true, final: false });
    expect(last).toEqual({ initial: false, final: true });
    expect(isNucleusWordPositionAllowed(foot, first)).toBe(true);
    expect(isNucleusWordPositionAllowed(foot, last)).toBe(false);
  });

  it.each([-1, NaN, Infinity])("rejects an invalid explicit positional weight %s", final => {
    const invalid = { ...foot, nucleusWordPosition: { initial: 2, medial: 2, final } };
    expect(() => createGenerator(fixedShape([invalid, goose], 1, 1))).toThrow(/nucleusWordPosition.final/);
  });

  it.each([false, true])("preserves trace/no-trace outputs and RNG with morphology=%s", morphology => {
    const plain = createSeededRng(835167);
    const traced = createSeededRng(835167);
    let plainCalls = 0, tracedCalls = 0;
    for (let draw = 0; draw < 1_000; draw++) {
      const first = generateWord({ rand: () => { plainCalls++; return plain(); }, morphology });
      const second = generateWord({ rand: () => { tracedCalls++; return traced(); }, morphology, trace: true });
      const { trace, ...output } = second;
      expect(trace).toBeDefined();
      expect(output).toEqual(first);
    }
    expect(plainCalls).toBe(tracedCalls);
    expect(plain()).toBe(traced());
  });
});

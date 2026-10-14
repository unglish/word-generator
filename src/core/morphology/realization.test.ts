import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, generateWord } from "../../index.js";
import { englishConfig } from "../../config/english.js";
import type { Affix, LanguageConfig } from "../../config/language.js";
import type { Grapheme } from "../../types.js";

const prefixIn = englishConfig.morphology!.prefixes.find(affix => affix.written === "in")!;
const suffixNamed = (written: string) => englishConfig.morphology!.suffixes.find(affix => affix.written === written)!;

function customAffix(type: "prefix" | "suffix", planned: string, resolved: string): Affix {
  const form = { phonemes: ["ɪ", "n"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["n"] }], syllableCount: 1 };
  return {
    ...form, type, written: planned, frequency: 1, stressEffect: "none",
    allomorphs: [{ ...form, written: resolved, phonologicalCondition: { position: type === "prefix" ? "following" : "preceding" } }],
  };
}

function fixedRoot(options: { prefix?: Affix; suffix?: Affix; onset?: string; coda?: string; maxConsonants?: number } = {}) {
  const { prefix, suffix, onset = "b", coda = "t", maxConsonants = 3 } = options;
  const glyph = (phoneme: string, form: string): Grapheme => ({ phoneme, form, frequency: 1, origin: 0, startWord: 1, midWord: 1, endWord: 1 });
  const onsetGlyph = glyph(onset, onset);
  const nucleusGlyph = glyph("ɑ", "a");
  const codaGlyph = glyph(coda, coda);
  const one: [number, number][] = [[1, 1]];
  const template = prefix ? suffix ? "both" : "prefixed" : "suffixed";
  const weights = { bare: 0, prefixed: 0, suffixed: 0, both: 0, [template]: 1 };
  const target = 3;
  const config: LanguageConfig = {
    ...englishConfig,
    phonemeMaps: {
      onset: new Map([[onset, [englishConfig.phonemes.find(phoneme => phoneme.sound === onset)!]]]),
      nucleus: new Map([["ɑ", [englishConfig.phonemes.find(phoneme => phoneme.sound === "ɑ")!]]]),
      coda: new Map([[coda, [englishConfig.phonemes.find(phoneme => phoneme.sound === coda)!]]]),
    },
    graphemes: [onsetGlyph, nucleusGlyph, codaGlyph],
    graphemeMaps: { onset: new Map([[onset, [onsetGlyph]]]), nucleus: new Map([["ɑ", [nucleusGlyph]]]), coda: new Map([[coda, [codaGlyph]]]) },
    clusterConstraint: undefined,
    clusterWeights: undefined,
    clusterLimits: { maxOnset: 1, maxCoda: 1 },
    codaConstraints: { allowedFinal: [coda] },
    syllableStructure: { ...englishConfig.syllableStructure, maxOnsetLength: 1, maxCodaLength: 1, letterLengthTargets: undefined },
    phonemeLengthWeights: { text: [[target, 1]], lexicon: [[target, 1]] },
    generationWeights: {
      ...englishConfig.generationWeights,
      onsetLength: { monosyllabic: one, followingNucleus: one, default: one, long: one },
      codaLength: { monosyllabic: { 1: one }, monosyllabicDefault: one, polysyllabicNonzero: one, zeroWeightEndOfWord: 0, zeroWeightMidWord: 0 },
      probability: { ...englishConfig.generationWeights.probability, finalS: 0, nasalStopExtension: 0 },
    },
    pronunciation: {
      ...englishConfig.pronunciation,
      aspiration: { enabled: false, targets: [{ segment: "onset" }], rules: [{ id: "disabled", when: {}, probability: 0 }], fallbackProbability: 0 },
      vowelReduction: { enabled: false, rules: [], reduceSecondaryStress: false },
    },
    morphology: { ...englishConfig.morphology!, prefixes: prefix ? [prefix] : [], suffixes: suffix ? [suffix] : [], templateWeights: { text: weights, lexicon: weights } },
    doubling: undefined, silentE: undefined, spellingRules: [], gapSpellings: [],
    writtenFormConstraints: { ...englishConfig.writtenFormConstraints, maxConsonantLetters: maxConsonants },
  };
  const generator = createGenerator(config);
  const generation = { seed: 13, morphology: true, syllableCount: 1 };
  return { generator, config, generation, word: () => generator.generateWord({ ...generation, trace: true }) };
}

describe("resolved morphology survives final cleanup", () => {
  it("records the planned default in prefix and its selected im form", () => {
    const word = fixedRoot({ prefix: prefixIn, onset: "m" }).word();
    expect(word.written.clean).toBe("immat");
    expect(word.trace!.morphology!.prefix).toBe("in");
    const selection = word.trace!.morphology!.realization!.prefix!;
    expect(selection.planned.written).toBe("in");
    expect(selection.resolved.written).toBe("im");
    expect(selection.resolved.phonemes).toEqual(["ɪ", "m"]);
    expect(selection.boundaryPhoneme!.sound).toBe("m");
    expect(selection.allomorphIndex).toBe(0);
    expect(word.syllables[0].coda.map(phone => phone.sound)).toEqual(["m"]);
  });

  it.each([["b", "im", 0], ["m", "im", 0], ["t", "in", null], ["l", "in", null]] as const)(
    "selects the configured default prefix before /%s/", (onset, spelling, index) => {
      const word = fixedRoot({ prefix: prefixIn, onset }).word();
      expect(word.written.clean).toBe(`${spelling}${onset}at`);
      expect(word.trace!.morphology!.realization!.prefix!.allomorphIndex).toBe(index);
    },
  );

  it.each(["l", "r"])("preserves explicitly configured i%s assimilation without adding it to defaults", sound => {
    const prefix: Affix = {
      ...prefixIn,
      allomorphs: [{ phonologicalCondition: { position: "following", sounds: [sound] }, written: `i${sound}`, phonemes: ["ɪ", sound], syllables: [{ onset: [], nucleus: ["ɪ"], coda: [sound] }], syllableCount: 1 }],
    };
    const word = fixedRoot({ prefix, onset: sound }).word();
    expect(word.written.clean).toBe(`i${sound}${sound}at`);
    expect(word.syllables[0].coda.map(phone => phone.sound)).toEqual([sound]);
  });

  it.each([
    ["prefix", "un", "over"], ["prefix", "over", "a"],
    ["suffix", "s", "ous"], ["suffix", "ness", "y"],
  ] as const)("preserves a %s variant of different written length: %s → %s", (type, planned, resolved) => {
    const word = fixedRoot({ [type]: customAffix(type, planned, resolved) }).word();
    expect(word.written.clean).toBe(type === "prefix" ? `${resolved}bat` : `bat${resolved}`);
    const parts = word.trace!.morphology!.realization!.emittedParts;
    expect(parts.find(part => part.role === "root")!.text).toBe("bat");
    expect(parts.find(part => part.role === type)!.text).toBe(resolved);
  });

  it("preserves both different-length variants around the same root", () => {
    const word = fixedRoot({ prefix: customAffix("prefix", "over", "a"), suffix: customAffix("suffix", "s", "ous") }).word();
    expect(word.written.clean).toBe("abatous");
    expect(word.trace!.morphology!.realization!.assembledParts).toEqual([
      { role: "prefix", text: "a" }, { role: "root", text: "bat" }, { role: "suffix", text: "ous" },
    ]);
  });

  it.each([
    ["ed", "t", 2, ["ɪ", "d"], 1], ["ed", "k", 0, ["t"], 0], ["ed", "m", 1, ["d"], 0],
    ["s", "s", 2, ["ɪ", "z"], 1], ["s", "k", 0, ["s"], 0], ["s", "m", 1, ["z"], 0],
  ] satisfies [string, string, number, string[], number][])(
    "preserves %s after /%s/, with original variant index %i", (suffix, coda, index, phones, syllables) => {
      const word = fixedRoot({ suffix: suffixNamed(suffix), coda }).word();
      const selected = word.trace!.morphology!.realization!.suffix!;
      expect(selected.allomorphIndex).toBe(index);
      expect(selected.resolved.phonemes).toEqual(phones);
      expect(selected.resolved.syllableCount).toBe(syllables);
      expect(word.trace!.syllableCount).toBe(1);
      expect(word.trace!.targetPhonemeCount).toBe(3);
      expect(word.trace!.syllablePlans).toHaveLength(1);
      expect(word.trace!.stages.at(-1)!.after).toHaveLength(1);
      expect(word.syllables).toHaveLength(1 + syllables);
      const finalPhones = word.syllables.flatMap(syllable => [...syllable.onset, ...syllable.nucleus, ...syllable.coda]).map(phone => phone.sound);
      expect(finalPhones.slice(-phones.length)).toEqual(phones);
    },
  );

  it("carries the transformed root rather than reconstructing its original spelling", () => {
    const word = fixedRoot({ suffix: suffixNamed("ing") }).word();
    expect(word.written.clean).toBe("batting");
    expect(word.trace!.morphology!.realization!.assembledParts).toEqual([{ role: "root", text: "batt" }, { role: "suffix", text: "ing" }]);
  });

  it("composes a changed-length prefix with a real suffix boundary transform", () => {
    const word = fixedRoot({ prefix: customAffix("prefix", "over", "a"), suffix: suffixNamed("ing") }).word();
    expect(word.written.clean).toBe("abatting");
    expect(word.trace!.morphology!.realization!.emittedParts).toEqual([
      { role: "prefix", text: "a" }, { role: "root", text: "batt" }, { role: "suffix", text: "ing" },
    ]);
  });

  it("retains paired phonological and written root alternations", () => {
    const word = fixedRoot({ suffix: suffixNamed("ity"), coda: "k" }).word();
    expect(word.written.clean).toBe("basity");
    expect(word.syllables[0].coda.map(phone => phone.sound)).toEqual(["s"]);
    expect(word.trace!.morphology!.realization!.suffix!.boundaryPhoneme!.sound).toBe("k");
    expect(word.trace!.morphology!.realization!.assembledParts[0].text).toBe("bas");
  });

  it("records cleanup loss separately from the selected affix", () => {
    const word = fixedRoot({ prefix: customAffix("prefix", "un", "trans"), maxConsonants: 2 }).word();
    const realization = word.trace!.morphology!.realization!;
    expect(realization.prefix!.resolved.written).toBe("trans");
    expect(realization.assembledParts[0].text).toBe("trans");
    expect(realization.emittedParts[0].text).toBe("tran");
    expect(word.written.clean).toBe("tranbat");
  });

  it("keeps snapshots independent of config, surface phones, and later calls", () => {
    const fixture = fixedRoot({ prefix: customAffix("prefix", "un", "over") });
    const word = fixture.word();
    const original = structuredClone(word);
    const selected = word.trace!.morphology!.realization!.prefix!;
    selected.resolved.phonemes[0] = "changed";
    selected.resolved.syllables![0].nucleus[0] = "changed";
    selected.planned.phonemes[0] = "changed";
    selected.boundaryPhoneme!.sound = "changed";
    word.trace!.morphology!.realization!.emittedParts[0].text = "changed";
    expect(word.trace!.morphology!.realization!.assembledParts[0].text).toBe("over");
    expect(word.syllables[0].nucleus[0].sound).toBe("ɪ");
    expect(fixture.word()).toEqual(original);
  });

  it("keeps tracing observational and seeded calls deterministic", () => {
    const fixture = fixedRoot({ prefix: prefixIn, suffix: suffixNamed("ed"), onset: "m" });
    const traced = fixture.word();
    const plain = fixture.generator.generateWord(fixture.generation);
    expect({ ...traced, trace: undefined }).toEqual(plain);
    expect(fixture.word()).toEqual(traced);
  });

  it("snapshots only selection features and detaches them from the root phone", () => {
    const fixture = fixedRoot({ prefix: prefixIn });
    const word = fixture.word();
    const boundary = word.trace!.morphology!.realization!.prefix!.boundaryPhoneme!;
    expect(Object.keys(boundary).sort()).toEqual(["mannerOfArticulation", "placeOfArticulation", "sound", "voiced"]);
    boundary.sound = "k";
    boundary.voiced = false;
    boundary.mannerOfArticulation = "fricative";
    boundary.placeOfArticulation = "velar";
    expect(word.syllables[1].onset[0]).toMatchObject({ sound: "b", voiced: true, mannerOfArticulation: "stop", placeOfArticulation: "bilabial" });
    expect(fixture.word().trace!.morphology!.realization!.prefix!.boundaryPhoneme).toEqual({ sound: "b", voiced: true, mannerOfArticulation: "stop", placeOfArticulation: "bilabial" });
  });

  it("preserves assembly across a continuous 10,000-word public-API stream", { timeout: 30_000 }, () => {
    const rand = createSeededRng(20260926);
    let affixed = 0;
    let selectedIm = 0;
    for (let i = 0; i < 10_000; i++) {
      const word = generateWord({ rand, trace: true });
      const realization = word.trace!.morphology?.realization;
      if (!realization) continue;
      affixed++;
      expect(realization.emittedParts.map(part => part.text).join("")).toBe(word.written.clean);
      for (const role of ["prefix", "suffix"] as const) {
        const selection = realization[role];
        if (!selection) continue;
        expect(realization.assembledParts.find(part => part.role === role)!.text).toBe(selection.resolved.written);
        if (role === "prefix" && selection.resolved.written === "im") {
          selectedIm++;
          expect(word.written.clean.startsWith("im")).toBe(true);
        }
      }
    }
    expect(affixed).toBeGreaterThan(5000);
    expect(selectedIm).toBeGreaterThan(30);
  });
});

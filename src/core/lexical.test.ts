import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import type { Affix } from "../config/language.js";
import type { Word } from "../types.js";
import { createGenerator, generateWords } from "./generate.js";

const affix = (written: string, type: "prefix" | "suffix"): Affix => {
  const pool = type === "prefix" ? englishConfig.morphology!.prefixes : englishConfig.morphology!.suffixes;
  return pool.find(entry => entry.written === written)!;
};

function lexicalGenerator(options: { prefix?: string; suffix?: string; vowels?: string[] } = {}) {
  const { prefix, suffix, vowels = ["ʌ"] } = options;
  const templateWeights = {
    bare: prefix || suffix ? 0 : 1,
    prefixed: prefix && !suffix ? 1 : 0,
    suffixed: suffix && !prefix ? 1 : 0,
    both: prefix && suffix ? 1 : 0,
  };
  return createGenerator({
    ...englishConfig,
    phonemeMaps: {
      ...englishConfig.phonemeMaps,
      nucleus: new Map(vowels.map(sound => [sound, englishConfig.phonemeMaps.nucleus.get(sound)!])),
    },
    pronunciation: {
      ...englishConfig.pronunciation,
      stress: {
        ...englishConfig.pronunciation.stress,
        primary: { type: "initial" },
        secondary: { ...englishConfig.pronunciation.stress.secondary, enabled: false },
        rhythmic: { ...englishConfig.pronunciation.stress.rhythmic, enabled: false },
      },
      aspiration: {
        enabled: true,
        targets: [{ segment: "onset", index: 0, manner: ["stop"], voiced: false }],
        rules: [{ id: "word-initial-only", when: { wordInitial: true }, probability: 100 }],
        fallbackProbability: 0,
      },
      vowelReduction: {
        enabled: true,
        rules: [{ source: "ʌ", target: "ə", probability: 100 }],
        reduceSecondaryStress: true,
      },
    },
    morphology: {
      ...englishConfig.morphology!,
      prefixes: prefix ? [affix(prefix, "prefix")] : englishConfig.morphology!.prefixes,
      suffixes: suffix ? [affix(suffix, "suffix")] : englishConfig.morphology!.suffixes,
      templateWeights: { text: templateWeights, lexicon: templateWeights },
    },
  });
}

const SEEDS = Array.from({ length: 40 }, (_, seed) => seed);

/** Root-relative indices of root syllables whose nucleus the final stress repair replaced. */
function repairedRootSyllables(word: Word): number[] {
  const stage = word.trace!.stages.find(entry => entry.name === "repairFinalStressedNuclei")!;
  const start = word.lexical!.rootSyllableStart;
  return word.lexical!.root
    .map((_, index) => index)
    .filter(index => stage.before[start + index].nucleus.join() !== stage.after[start + index].nucleus.join());
}

describe("lexical composition before surface realization", () => {
  it("preserves monosyllabic root stress through a neutral polysyllabic suffix", () => {
    const generator = lexicalGenerator({ suffix: "able" });
    for (const seed of SEEDS) {
      const word = generator.generateWord({ seed, syllableCount: 1, morphology: true, trace: true });
      expect(word.lexical!.root).toHaveLength(1);
      expect(word.syllables.map(syllable => syllable.stress)).toEqual(["ˈ", undefined, undefined]);
      expect(word.syllables[0].nucleus[0].sound).toBe("ʌ");
      expect(word.syllables[1].nucleus[0].sound).toBe("ə");
      expect(word.syllables[2].nucleus[0].sound).toBe("ə");
    }
  });

  it("moves stress before reducing a suffix-attracted root vowel", () => {
    const generator = lexicalGenerator({ suffix: "tion" });
    for (const seed of SEEDS) {
      const word = generator.generateWord({ seed, syllableCount: 2, morphology: true, trace: true });
      expect(word.lexical!.root.map(syllable => syllable.stress)).toEqual(["ˈ", undefined]);
      expect(word.lexical!.syllables.map(syllable => syllable.stress)).toEqual(["ˌ", "ˈ", undefined]);
      expect(word.syllables[0].nucleus[0]).toMatchObject({ sound: "ə", reduced: true });
      expect(word.syllables[1].nucleus[0].sound).toBe("ʌ");
      expect(word.syllables[1].nucleus[0].reduced).toBeUndefined();
      expect(word.lexical!.root.every(syllable => syllable.nucleus[0].sound === "ʌ")).toBe(true);
      const stages = word.trace!.stages;
      expect(stages.filter(stage => stage.name === "generatePronunciation")).toHaveLength(1);
      expect(stages.find(stage => stage.name === "generatePronunciation")!.before[1]).toMatchObject({
        stress: "ˈ", nucleus: ["ʌ"],
      });
      expect(stages.find(stage => stage.name === "generatePronunciation")!.after[0]).toMatchObject({
        stress: "ˌ", nucleus: ["ə"], reducedNuclei: [0],
      });
    }
  });

  it("retains primary root stress after a secondary-stressed prefix", () => {
    const generator = lexicalGenerator({ prefix: "un" });
    for (const seed of SEEDS) {
      const word = generator.generateWord({ seed, syllableCount: 1, morphology: true });
      expect(word.lexical!.rootSyllableStart).toBe(1);
      expect(word.syllables.map(syllable => syllable.stress)).toEqual(["ˌ", "ˈ"]);
      expect(word.syllables[1].nucleus[0].sound).toBe("ʌ");
    }
  });

  it("reduces a demoted root only after the prefix takes primary stress", () => {
    const generator = lexicalGenerator({ prefix: "out" });
    for (const seed of SEEDS) {
      const word = generator.generateWord({ seed, syllableCount: 1, morphology: true });
      expect(word.syllables.map(syllable => syllable.stress)).toEqual(["ˈ", "ˌ"]);
      expect(word.syllables[1].nucleus[0]).toMatchObject({ sound: "ə", reduced: true });
      expect(word.lexical!.root[0].nucleus[0].sound).toBe("ʌ");
    }
  });

  it("spells only a repaired root syllable with its final-word stress", () => {
    const generator = lexicalGenerator({ suffix: "tion", vowels: ["ʌ", "ə"] });
    let repairedDoublingRolls = 0;
    let unstressedDoublingSkips = 0;
    for (let seed = 0; seed < 300; seed++) {
      const word = generator.generateWord({ seed, syllableCount: 2, morphology: true, trace: true });
      const stages = word.trace!.stages;
      const rootStress = stages.find(entry => entry.name === "applyStress")!.after.map(syllable => syllable.stress);
      const spelled = stages.find(entry => entry.name === "generateWrittenForm")!.before;
      const isRepaired = repairedRootSyllables(word).includes(1);
      expect(rootStress).toEqual(["ˈ", undefined]);
      // The unrepaired syllable keeps root stress rather than its final secondary stress.
      expect(word.lexical!.syllables[0].stress).toBe("ˌ");
      expect(word.lexical!.root[0].stress).toBe("ˈ");
      expect(spelled[0].stress).toBe("ˈ");
      expect(word.lexical!.root[1].stress).toBe(isRepaired ? "ˈ" : undefined);
      expect(spelled[1].stress).toBe(isRepaired ? "ˈ" : undefined);
      for (const decision of word.trace!.graphemeSelections.filter(entry => entry.syllableIndex === 1)) {
        const unstressedSkip = decision.doubling?.reason === "zero-probability:unstressed";
        if (isRepaired) {
          expect(unstressedSkip).toBe(false);
          if (decision.doubling?.attempted) repairedDoublingRolls++;
        } else if (unstressedSkip) {
          unstressedDoublingSkips++;
        }
      }
    }
    // Stress-conditioned doubling is reached in both cases, so the contrast is not vacuous.
    expect(repairedDoublingRolls).toBeGreaterThan(0);
    expect(unstressedDoublingSkips).toBeGreaterThan(0);
  });

  it("repairs a promoted lexical schwa before choosing its spelling", () => {
    const generator = lexicalGenerator({ suffix: "tion", vowels: ["ʌ", "ə"] });
    let repaired = 0;
    for (let seed = 0; seed < 100; seed++) {
      const word = generator.generateWord({ seed, syllableCount: 2, morphology: true, trace: true });
      const stage = word.trace!.stages.find(entry => entry.name === "repairFinalStressedNuclei")!;
      if (stage.before[1].nucleus[0] !== "ə") continue;
      repaired++;
      expect(stage.after[1].nucleus[0]).toBe("ʌ");
      expect(word.lexical!.root[1].nucleus[0].sound).toBe("ʌ");
      expect(word.trace!.graphemeSelections.find(entry => entry.syllableIndex === 1 && entry.position === "nucleus")!.phoneme).toBe("ʌ");
    }
    expect(repaired).toBeGreaterThan(0);
  });

  it("keeps base vowels for spelling while retaining morphophonemic alternations", () => {
    const generator = lexicalGenerator({ suffix: "ity", vowels: ["aɪ"] });
    for (const seed of SEEDS) {
      const word = generator.generateWord({ seed, syllableCount: 1, morphology: true, trace: true });
      expect(word.lexical!.root[0].nucleus[0].sound).toBe("aɪ");
      expect(word.lexical!.syllables[0].nucleus[0].sound).toBe("ɪ");
      expect(word.syllables[0].nucleus[0].sound).toBe("ɪ");
      expect(word.trace!.graphemeSelections.find(entry => entry.position === "nucleus")!.phoneme).toBe("aɪ");
      expect(word.trace!.morphology!.alternations).toContainEqual(expect.objectContaining({
        rule: "ity-diphthong-flattening", soundBefore: "aɪ", soundAfter: "ɪ",
      }));
    }
  });

  it("makes one aspiration decision per final syllable using its final position", () => {
    const generator = lexicalGenerator({ prefix: "un" });
    let eligibleRoots = 0;
    for (let seed = 0; seed < 100; seed++) {
      const word = generator.generateWord({ seed, syllableCount: 1, morphology: true, trace: true });
      const decisions = word.trace!.structural.filter(entry => entry.event === "aspirationDecision");
      expect(decisions).toHaveLength(word.syllables.length);
      const rootDecision = decisions[1];
      if (rootDecision.event !== "aspirationDecision" || !rootDecision.evaluated) continue;
      eligibleRoots++;
      expect(rootDecision.probability).toBe(0);
      expect(rootDecision.applied).toBe(false);
      expect(word.syllables[1].onset[0].aspirated).toBeUndefined();
    }
    expect(eligibleRoots).toBeGreaterThan(0);
  });

  it("keeps lexical objects independent of each other and the returned surface", () => {
    const generator = lexicalGenerator({ suffix: "tion" });
    const word = generator.generateWord({ seed: 855, syllableCount: 2, morphology: true });
    word.syllables[1].nucleus[0].sound = "changed-surface";
    expect(word.lexical!.syllables[1].nucleus[0].sound).toBe("ʌ");
    word.lexical!.syllables[1].nucleus[0].sound = "changed-derived";
    expect(word.lexical!.root[1].nucleus[0].sound).toBe("ʌ");
  });

  it("tracing does not change lexical or surface generation", () => {
    const generator = lexicalGenerator({ suffix: "tion", vowels: ["ʌ", "ə"] });
    for (const seed of SEEDS) {
      const plain = generator.generateWord({ seed, syllableCount: 2, morphology: true });
      const traced = generator.generateWord({ seed, syllableCount: 2, morphology: true, trace: true });
      expect({ ...traced, trace: undefined }).toEqual(plain);
    }
  });

  it("does not attribute an unrelated root grapheme to a morphology bridge", () => {
    const prefix = affix("re", "prefix");
    const templateWeights = { bare: 0, prefixed: 1, suffixed: 0, both: 0 };
    const generator = createGenerator({
      ...englishConfig,
      morphology: {
        ...englishConfig.morphology!,
        prefixes: [prefix],
        templateWeights: { text: templateWeights, lexicon: templateWeights },
      },
    });
    // Witness: a bridge /h/ before a vowel-initial root whose second syllable also
    // starts with /h/, so the bridge's word index equals that root syllable's index.
    let witnesses = 0;
    for (let seed = 0; seed < 5000 && witnesses < 3; seed++) {
      const word = generator.generateWord({ seed, syllableCount: 2, morphology: true, trace: true });
      const trace = word.trace!;
      const bridgeIndex = trace.structural.findIndex(event => event.event === "morphPrefixHiatusFallback" && event.inserted === "h");
      if (bridgeIndex < 0 || word.lexical!.root[1].onset[0]?.sound !== "h") continue;
      witnesses++;
      expect(word.lexical!.rootSyllableStart).toBe(1);
      expect(word.lexical!.root[0].onset).toHaveLength(0);
      expect(trace.structural[bridgeIndex]).toMatchObject({ syllableIndex: 1 });
      const rootH = trace.orthography!.graphemeUnits.find(unit => unit.phoneme === "h" && unit.syllableIndex === 1)!;
      expect(rootH).toBeDefined();
      expect(rootH.links).not.toContainEqual(expect.objectContaining({ kind: "structural", index: bridgeIndex }));
      expect(trace.orthography!.source).toEqual({ kind: "lexical-root", wordSyllableStart: 1 });
    }
    expect(witnesses).toBeGreaterThan(0);
  });

  it("has exactly one primary and no primary reduced vowels in a default affixed sample", { timeout: 30_000 }, () => {
    const words = generateWords(10_000, { seed: 908172, morphology: true, trace: true });
    let unstressedSchwas = 0;
    for (const word of words) {
      const primary = word.syllables.filter(syllable => syllable.stress === "ˈ");
      expect(primary).toHaveLength(1);
      for (const vowel of primary[0].nucleus) {
        expect(vowel.sound).not.toBe("ə");
        expect(vowel.reduced).toBeUndefined();
      }
      unstressedSchwas += word.syllables.filter(syllable => !syllable.stress && syllable.nucleus.some(vowel => vowel.sound === "ə")).length;
      for (const unit of word.trace!.orthography!.graphemeUnits) {
        for (const link of unit.links ?? []) {
          if (link.kind !== "structural") continue;
          const event = word.trace!.structural[link.index].event;
          expect(event).not.toBe("morphPrefixHiatusFallback");
          expect(event).not.toBe("morphSuffixHiatusFallback");
        }
      }
    }
    expect(unstressedSchwas).toBeGreaterThan(0);
  });
});

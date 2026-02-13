import { describe, it, expect } from "vitest";
import { planMorphology, applyMorphology } from "./morphology.js";
import { createSeededRng } from "../utils/random.js";
import { MorphologyConfig, Affix } from "../config/language.js";
import { Phoneme, Syllable, WordGenerationContext } from "../types.js";
import { phonemes as allPhonemes } from "../elements/phonemes.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findPhoneme(sound: string): Phoneme {
  const p = allPhonemes.find(ph => ph.sound === sound);
  if (!p) throw new Error(`Phoneme "${sound}" not found`);
  return p;
}

function makeSyllable(onset: string[], nucleus: string[], coda: string[], stress?: "ˈ" | "ˌ"): Syllable {
  return {
    onset: onset.map(findPhoneme),
    nucleus: nucleus.map(findPhoneme),
    coda: coda.map(findPhoneme),
    stress,
  };
}

function makeContext(
  syllables: Syllable[],
  written: string,
  seed: number = 1,
): WordGenerationContext {
  return {
    rand: createSeededRng(seed),
    word: {
      syllables,
      pronunciation: "",
      written: { clean: written, hyphenated: written },
    },
    syllableCount: syllables.length,
    currSyllableIndex: 0,
  };
}

function makeRuntime(phonemeInventory: Phoneme[] = allPhonemes) {
  return {
    config: {
      phonemes: phonemeInventory,
      vowelReduction: undefined,
    },
  };
}

const simpleSuffix: Affix = {
  type: "suffix",
  written: "ing",
  phonemes: ["ɪ", "ŋ"],
  syllableCount: 1,
  stressEffect: "none",
  frequency: 100,
  boundaryRules: { dropSilentE: true, doubleConsonant: true },
};

const simplePrefix: Affix = {
  type: "prefix",
  written: "un",
  phonemes: ["ʌ", "n"],
  syllableCount: 1,
  stressEffect: "secondary",
  frequency: 100,
};

const edSuffix: Affix = {
  type: "suffix",
  written: "ed",
  phonemes: ["d"],
  syllableCount: 0,
  stressEffect: "none",
  frequency: 70,
  boundaryRules: { dropSilentE: true, doubleConsonant: true },
  allomorphs: [
    { condition: "after-voiceless", phonemes: ["t"], syllableCount: 0 },
    { condition: "after-voiced", phonemes: ["d"], syllableCount: 0 },
    { condition: "after-alveolar-stop", phonemes: ["ɪ", "d"], syllableCount: 1, written: "ed" },
  ],
};

const sSuffix: Affix = {
  type: "suffix",
  written: "s",
  phonemes: ["z"],
  syllableCount: 0,
  stressEffect: "none",
  frequency: 100,
  allomorphs: [
    { condition: "after-voiceless", phonemes: ["s"], syllableCount: 0 },
    { condition: "after-voiced", phonemes: ["z"], syllableCount: 0 },
    { condition: "after-sibilant", phonemes: ["ɪ", "z"], syllableCount: 1, written: "es" },
  ],
};

const inPrefix: Affix = {
  type: "prefix",
  written: "in",
  phonemes: ["ɪ", "n"],
  syllableCount: 1,
  stressEffect: "secondary",
  frequency: 50,
  allomorphs: [{ condition: "before-bilabial", phonemes: ["ɪ", "m"], syllableCount: 1, written: "im" }],
};

const tionSuffix: Affix = {
  type: "suffix",
  written: "tion",
  phonemes: ["ʃ", "ə", "n"],
  syllableCount: 1,
  stressEffect: "attract-preceding",
  frequency: 80,
};

function makeConfig(overrides: Partial<MorphologyConfig> = {}): MorphologyConfig {
  return {
    enabled: true,
    prefixes: [simplePrefix],
    suffixes: [simpleSuffix],
    templateWeights: {
      text: { bare: 0, suffixed: 100, prefixed: 0, both: 0 },
      lexicon: { bare: 0, suffixed: 100, prefixed: 0, both: 0 },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("morphology", () => {
  describe("planMorphology", () => {
    it("template selection respects weights (bare=100)", () => {
      const config = makeConfig({
        templateWeights: {
          text: { bare: 100, suffixed: 0, prefixed: 0, both: 0 },
          lexicon: { bare: 100, suffixed: 0, prefixed: 0, both: 0 },
        },
      });
      const rand = createSeededRng(42);
      const { plan } = planMorphology(config, "text", rand);
      expect(plan.template).toBe("bare");
    });

    it("template selection respects weights (suffixed=100)", () => {
      const config = makeConfig({
        templateWeights: {
          text: { bare: 0, suffixed: 100, prefixed: 0, both: 0 },
          lexicon: { bare: 0, suffixed: 100, prefixed: 0, both: 0 },
        },
      });
      const rand = createSeededRng(42);
      const { plan } = planMorphology(config, "text", rand);
      expect(plan.template).toBe("suffixed");
      expect(plan.suffix).toBeDefined();
    });

    it("syllable count adjustment for suffixed", () => {
      const config = makeConfig({ suffixes: [simpleSuffix] });
      const rand = createSeededRng(42);
      const { syllableReduction } = planMorphology(config, "text", rand);
      expect(syllableReduction).toBe(1); // -ing adds 1 syllable
    });
  });

  describe("suffix attachment", () => {
    it("produces correct written form", () => {
      const rt = makeRuntime();
      // Root: "blork" — b l ɔ r k
      const ctx = makeContext(
        [makeSyllable(["b", "l"], ["ɔ"], ["r", "k"])],
        "blork",
      );
      const plan = { template: "suffixed" as const, suffix: simpleSuffix };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe("blorking");
    });
  });

  describe("prefix attachment", () => {
    it("produces correct written form", () => {
      const rt = makeRuntime();
      const ctx = makeContext(
        [makeSyllable(["b", "l"], ["ɔ"], ["r", "k"])],
        "blork",
      );
      const plan = { template: "prefixed" as const, prefix: simplePrefix };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe("unblork");
    });
  });

  describe("both prefix+suffix", () => {
    it("produces correct written form", () => {
      const rt = makeRuntime();
      const ctx = makeContext(
        [makeSyllable(["b", "l"], ["ɔ"], ["r", "k"])],
        "blork",
      );
      const plan = { template: "both" as const, prefix: simplePrefix, suffix: simpleSuffix };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe("unblorking");
    });
  });

  describe("allomorph selection", () => {
    it("-ed after voiceless → /t/", () => {
      const rt = makeRuntime();
      // Root ends with /k/ (voiceless stop)
      const ctx = makeContext(
        [makeSyllable(["b"], ["ɔ"], ["k"])],
        "bock",
      );
      const plan = { template: "suffixed" as const, suffix: edSuffix };
      applyMorphology(rt, ctx, plan);
      // /t/ should be appended to coda (syllableCount: 0)
      const lastSyl = ctx.word.syllables[ctx.word.syllables.length - 1];
      const lastCodaSound = lastSyl.coda[lastSyl.coda.length - 1]?.sound;
      expect(lastCodaSound).toBe("t");
      expect(ctx.word.written.clean).toBe("bocked");
    });

    it("-ed after voiced → /d/", () => {
      const rt = makeRuntime();
      // Root ends with /b/ (voiced stop, bilabial — NOT alveolar)
      const ctx = makeContext(
        [makeSyllable(["t"], ["æ"], ["b"])],
        "tab",
      );
      const plan = { template: "suffixed" as const, suffix: edSuffix };
      applyMorphology(rt, ctx, plan);
      const lastSyl = ctx.word.syllables[ctx.word.syllables.length - 1];
      const lastCodaSound = lastSyl.coda[lastSyl.coda.length - 1]?.sound;
      expect(lastCodaSound).toBe("d");
    });

    it("-ed after alveolar stop → /ɪd/", () => {
      const rt = makeRuntime();
      // Root ends with /t/ (alveolar stop)
      const ctx = makeContext(
        [makeSyllable(["b"], ["æ"], ["t"])],
        "bat",
      );
      const plan = { template: "suffixed" as const, suffix: edSuffix };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe("batted"); // doubleConsonant: bat → batt + ed
      // Should have added a syllable
      expect(ctx.word.syllables.length).toBe(2);
    });

    it("-s after sibilant → 'es'", () => {
      const rt = makeRuntime();
      // Root ends with /s/ (sibilant)
      const sPhoneme = findPhoneme("s");
      const ctx = makeContext(
        [{ onset: [findPhoneme("b")], nucleus: [findPhoneme("ʌ")], coda: [sPhoneme], stress: undefined }],
        "bus",
      );
      const plan = { template: "suffixed" as const, suffix: sSuffix };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe("buses");
    });

    it("in- before bilabial → 'im'", () => {
      const rt = makeRuntime();
      // Root starts with /b/ (bilabial)
      const ctx = makeContext(
        [makeSyllable(["b"], ["ɔ"], ["l"])],
        "bol",
      );
      const plan = { template: "prefixed" as const, prefix: inPrefix };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe("imbol");
    });
  });

  describe("boundary rules", () => {
    it("dropSilentE", () => {
      const rt = makeRuntime();
      const ctx = makeContext(
        [makeSyllable(["b"], ["eɪ"], ["k"])],
        "bake",
      );
      const plan = { template: "suffixed" as const, suffix: simpleSuffix };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe("baking");
    });

    it("doubleConsonant", () => {
      const rt = makeRuntime();
      // "stop" — single consonant after single vowel, monosyllable
      const ctx = makeContext(
        [makeSyllable(["s", "t"], ["ɑ"], ["p"])],
        "stop",
      );
      const plan = { template: "suffixed" as const, suffix: simpleSuffix };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe("stopping");
    });

    it("yToI", () => {
      const rt = makeRuntime();
      const lySuffix: Affix = {
        type: "suffix", written: "ness", phonemes: ["n", "ə", "s"],
        syllableCount: 1, stressEffect: "none", frequency: 60,
        boundaryRules: { yToI: true },
      };
      const ctx = makeContext(
        [makeSyllable(["h"], ["æ"], []), makeSyllable(["p"], ["i:"], [])],
        "happy",
      );
      const plan = { template: "suffixed" as const, suffix: lySuffix };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe("happiness");
    });
  });

  describe("stress effects", () => {
    it("attract-preceding shifts primary stress", () => {
      const rt = makeRuntime();
      // Two syllable root with stress on first
      const ctx = makeContext(
        [makeSyllable(["b"], ["ɔ"], [], "ˈ"), makeSyllable(["l"], ["ɪ"], [])],
        "boli",
      );
      const plan = { template: "suffixed" as const, suffix: tionSuffix };
      applyMorphology(rt, ctx, plan);
      // Primary stress should move to the syllable before -tion (index 1)
      expect(ctx.word.syllables[1].stress).toBe("ˈ");
      // Original primary should be demoted to secondary
      expect(ctx.word.syllables[0].stress).toBe("ˌ");
    });
  });

  describe("bare template", () => {
    it("returns word unchanged", () => {
      const rt = makeRuntime();
      const ctx = makeContext(
        [makeSyllable(["b"], ["ɔ"], ["k"])],
        "bock",
      );
      const originalWritten = ctx.word.written.clean;
      const plan = { template: "bare" as const };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe(originalWritten);
    });
  });

  describe("syllable count adjustment", () => {
    it("suffixed word targets fewer root syllables", () => {
      const config = makeConfig({
        suffixes: [{ ...simpleSuffix, syllableCount: 2 }],
      });
      const rand = createSeededRng(42);
      const { syllableReduction } = planMorphology(config, "text", rand);
      expect(syllableReduction).toBe(2);
    });

    it("both prefix+suffix reduces by combined count", () => {
      const config = makeConfig({
        prefixes: [simplePrefix], // 1 syllable
        suffixes: [simpleSuffix], // 1 syllable
        templateWeights: {
          text: { bare: 0, suffixed: 0, prefixed: 0, both: 100 },
          lexicon: { bare: 0, suffixed: 0, prefixed: 0, both: 100 },
        },
      });
      const rand = createSeededRng(42);
      const { syllableReduction } = planMorphology(config, "text", rand);
      expect(syllableReduction).toBe(2);
    });
  });

  describe("affricate sibilant allomorph", () => {
    it("-s after affricate /tʃ/ → 'es' (sibilant allomorph)", () => {
      const rt = makeRuntime();
      const ctx = makeContext(
        [makeSyllable(["b"], ["ɔ"], ["tʃ"])],
        "botch",
      );
      const plan = { template: "suffixed" as const, suffix: sSuffix };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe("botches");
    });
  });

  describe("dropSilentE prevents doubleConsonant", () => {
    it("dropSilentE prevents doubleConsonant", () => {
      const rt = makeRuntime();
      const ctx = makeContext(
        [makeSyllable(["d"], ["aɪ"], ["n"])],
        "dine",
      );
      const plan = { template: "suffixed" as const, suffix: simpleSuffix }; // -ing has both rules
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe("dining"); // not "dinning"
    });
  });

  describe("maximal onset resyllabification", () => {
    it("-able syllables use maximal onset (/ə.bəl/ not /əb.əl/)", () => {
      const rt = makeRuntime();
      const ableSuffix: Affix = {
        type: "suffix", written: "able", phonemes: ["ə", "b", "ə", "l"],
        syllableCount: 2, stressEffect: "none", frequency: 40,
        boundaryRules: { dropSilentE: true, doubleConsonant: true, yToI: true },
      };
      const ctx = makeContext(
        [makeSyllable(["t"], ["ɛ"], ["s", "t"])],
        "test",
      );
      const plan = { template: "suffixed" as const, suffix: ableSuffix };
      applyMorphology(rt, ctx, plan);
      // Second affix syllable should have /b/ in onset, not first syllable coda
      const affixSyls = ctx.word.syllables.slice(1); // skip root syllable
      expect(affixSyls[0].coda.length).toBe(0); // no /b/ in coda
      expect(affixSyls[1].onset[0]?.sound).toBe("b"); // /b/ in onset of second affix syllable
    });
  });
});

import { describe, it, expect } from "vitest";
import { planMorphology, applyMorphology } from "./index.js";
import { applyBoundaryTransforms, matchesPhonologicalCondition } from "./attach.js";
import { createSeededRng } from "../../utils/random.js";
import { MorphologyConfig, Affix, BoundaryTransform, PhonologicalCondition } from "../../config/language.js";
import { Phoneme, Syllable, WordGenerationContext } from "../../types.js";
import { phonemes as allPhonemes } from "../../elements/phonemes.js";
import { TraceCollector } from "../trace.js";

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

function makeRuntime(
  phonemeInventory: Phoneme[] = allPhonemes,
  morphology?: MorphologyConfig,
) {
  return {
    config: {
      phonemes: phonemeInventory,
      vowelReduction: undefined,
      morphology,
    },
  };
}

// ---------------------------------------------------------------------------
// Shared boundary transforms (mirroring english.ts)
// ---------------------------------------------------------------------------

const Y_TO_I: BoundaryTransform = { name: "y-to-i", match: /([^aeiou])y$/i, replace: "$1i" };
const DROP_SILENT_E: BoundaryTransform = { name: "drop-silent-e", match: /e$/i, replace: "" };
const DOUBLE_CONSONANT: BoundaryTransform = { name: "double-consonant", match: /([^aeiou])([aeiou])([bcdfghlmnprst])$/i, replace: "$1$2$3$3", blockedBy: ["drop-silent-e"] };

const BT_E_DOUBLE: BoundaryTransform[] = [DROP_SILENT_E, DOUBLE_CONSONANT];
const BT_Y: BoundaryTransform[] = [Y_TO_I];
const BT_ALL: BoundaryTransform[] = [Y_TO_I, DROP_SILENT_E, DOUBLE_CONSONANT];

// ---------------------------------------------------------------------------
// Test affixes
// ---------------------------------------------------------------------------

const simpleSuffix: Affix = {
  type: "suffix",
  written: "ing",
  phonemes: ["ɪ", "ŋ"],
  syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["ŋ"] }],
  syllableCount: 1,
  stressEffect: "none",
  frequency: 100,
  boundaryTransforms: BT_E_DOUBLE,
};

const simplePrefix: Affix = {
  type: "prefix",
  written: "un",
  phonemes: ["ʌ", "n"],
  syllables: [{ onset: [], nucleus: ["ʌ"], coda: ["n"] }],
  syllableCount: 1,
  stressEffect: "secondary",
  frequency: 100,
};

const edSuffix: Affix = {
  type: "suffix",
  written: "ed",
  phonemes: ["d"],
  syllables: [],
  syllableCount: 0,
  stressEffect: "none",
  frequency: 70,
  boundaryTransforms: BT_E_DOUBLE,
  allomorphs: [
    { phonologicalCondition: { position: "preceding", voiced: false }, phonemes: ["t"], syllables: [], syllableCount: 0 },
    { phonologicalCondition: { position: "preceding", voiced: true }, phonemes: ["d"], syllables: [], syllableCount: 0 },
    { phonologicalCondition: { position: "preceding", manner: ["stop"], place: ["alveolar"] }, phonemes: ["ɪ", "d"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["d"] }], syllableCount: 1, written: "ed" },
  ],
};

const sSuffix: Affix = {
  type: "suffix",
  written: "s",
  phonemes: ["z"],
  syllables: [],
  syllableCount: 0,
  stressEffect: "none",
  frequency: 100,
  allomorphs: [
    { phonologicalCondition: { position: "preceding", voiced: false }, phonemes: ["s"], syllables: [], syllableCount: 0 },
    { phonologicalCondition: { position: "preceding", voiced: true }, phonemes: ["z"], syllables: [], syllableCount: 0 },
    { phonologicalCondition: { position: "preceding", manner: ["sibilant", "affricate"] }, phonemes: ["ɪ", "z"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["z"] }], syllableCount: 1, written: "es" },
  ],
};

const inPrefix: Affix = {
  type: "prefix",
  written: "in",
  phonemes: ["ɪ", "n"],
  syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["n"] }],
  syllableCount: 1,
  stressEffect: "secondary",
  frequency: 50,
  allomorphs: [{ phonologicalCondition: { position: "following", place: ["bilabial"] }, phonemes: ["ɪ", "m"], syllables: [{ onset: [], nucleus: ["ɪ"], coda: ["m"] }], syllableCount: 1, written: "im" }],
};

const tionSuffix: Affix = {
  type: "suffix",
  written: "tion",
  phonemes: ["ʃ", "ə", "n"],
  syllables: [{ onset: ["ʃ"], nucleus: ["ə"], coda: ["n"] }],
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
      expect(syllableReduction).toBe(1);
    });
  });

  describe("suffix attachment", () => {
    it("produces correct written form", () => {
      const rt = makeRuntime();
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
      const ctx = makeContext(
        [makeSyllable(["b"], ["ɔ"], ["k"])],
        "bock",
      );
      const plan = { template: "suffixed" as const, suffix: edSuffix };
      applyMorphology(rt, ctx, plan);
      const lastSyl = ctx.word.syllables[ctx.word.syllables.length - 1];
      const lastCodaSound = lastSyl.coda[lastSyl.coda.length - 1]?.sound;
      expect(lastCodaSound).toBe("t");
      expect(ctx.word.written.clean).toBe("bocked");
    });

    it("-ed after voiced → /d/", () => {
      const rt = makeRuntime();
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
      const ctx = makeContext(
        [makeSyllable(["b"], ["æ"], ["t"])],
        "bat",
      );
      const plan = { template: "suffixed" as const, suffix: edSuffix };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe("batted");
      expect(ctx.word.syllables.length).toBe(2);
    });

    it("-s after sibilant → 'es'", () => {
      const rt = makeRuntime();
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
      const nessSuffix: Affix = {
        type: "suffix", written: "ness", phonemes: ["n", "ə", "s"],
        syllables: [{ onset: ["n"], nucleus: ["ə"], coda: ["s"] }],
        syllableCount: 1, stressEffect: "none", frequency: 60,
        boundaryTransforms: BT_Y,
      };
      const ctx = makeContext(
        [makeSyllable(["h"], ["æ"], []), makeSyllable(["p"], ["i:"], [])],
        "happy",
      );
      const plan = { template: "suffixed" as const, suffix: nessSuffix };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe("happiness");
    });

    it("applies prefix boundary transforms to root written form", () => {
      const rt = makeRuntime();
      const prePrefix: Affix = {
        type: "prefix",
        written: "pre",
        phonemes: ["p", "r", "i:"],
        syllables: [{ onset: ["p", "r"], nucleus: ["i:"], coda: [] }],
        syllableCount: 1,
        stressEffect: "secondary",
        frequency: 30,
        boundaryTransforms: [{ name: "drop-initial-a", match: /^a/i, replace: "" }],
      };
      const ctx = makeContext(
        [makeSyllable([], ["æ"], ["k"])],
        "ack",
      );
      const plan = { template: "prefixed" as const, prefix: prePrefix };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe("preck");
    });
  });

  describe("morphology boundary hiatus fallback", () => {
    const rePrefix: Affix = {
      type: "prefix",
      written: "re",
      phonemes: ["r", "ɪ"],
      syllables: [{ onset: ["r"], nucleus: ["ɪ"], coda: [] }],
      syllableCount: 1,
      stressEffect: "secondary",
      frequency: 40,
    };
    const erSuffix: Affix = {
      type: "suffix",
      written: "er",
      phonemes: ["ɚ"],
      syllables: [{ onset: [], nucleus: ["ɚ"], coda: [] }],
      syllableCount: 1,
      stressEffect: "none",
      frequency: 40,
    };
    const defaultBoundaryPolicy: MorphologyConfig = {
      enabled: true,
      prefixes: [],
      suffixes: [],
      templateWeights: {
        text: { bare: 100, suffixed: 0, prefixed: 0, both: 0 },
        lexicon: { bare: 100, suffixed: 0, prefixed: 0, both: 0 },
      },
      boundaryPolicy: {
        enablePrefixRootFallback: true,
        enableRootSuffixFallback: true,
        fallbackBridgeOnsets: [["h", 100]],
      },
    };

    const makeTracedContext = (syllables: Syllable[], written: string) => {
      const trace = new TraceCollector();
      const ctx = makeContext(syllables, written);
      ctx.trace = trace;
      return { ctx, trace };
    };

    it("inserts /h/ at prefix→root boundary when both sides are vowel-adjacent", () => {
      const { ctx, trace } = makeTracedContext([makeSyllable([], ["æ"], ["t"])], "at");
      applyMorphology(makeRuntime(), ctx, { template: "prefixed" as const, prefix: rePrefix });
      expect(ctx.word.syllables[1].onset[0]?.sound).toBe("h");
      expect(trace.structural.some(s => s.event === "morphPrefixHiatusFallback")).toBe(true);
    });

    it("inserts /h/ at root→suffix boundary when both sides are vowel-adjacent", () => {
      const { ctx, trace } = makeTracedContext([makeSyllable(["b"], ["eɪ"], [])], "bae");
      applyMorphology(makeRuntime(), ctx, { template: "suffixed" as const, suffix: erSuffix });
      expect(ctx.word.syllables[1].onset[0]?.sound).toBe("h");
      expect(trace.structural.some(s => s.event === "morphSuffixHiatusFallback")).toBe(true);
    });

    it("does not insert bridge when prefix→root fallback is disabled", () => {
      const { ctx, trace } = makeTracedContext([makeSyllable([], ["æ"], ["t"])], "at");
      const rt = makeRuntime(allPhonemes, {
        ...defaultBoundaryPolicy,
        boundaryPolicy: {
          ...defaultBoundaryPolicy.boundaryPolicy!,
          enablePrefixRootFallback: false,
        },
      });

      applyMorphology(rt, ctx, { template: "prefixed" as const, prefix: rePrefix });

      expect(ctx.word.syllables[1].onset.length).toBe(0);
      expect(trace.structural.some(s => s.event === "morphPrefixHiatusFallback")).toBe(false);
    });
  });

  describe("stress effects", () => {
    it("attract-preceding shifts primary stress", () => {
      const rt = makeRuntime();
      const ctx = makeContext(
        [makeSyllable(["b"], ["ɔ"], [], "ˈ"), makeSyllable(["l"], ["ɪ"], [])],
        "boli",
      );
      const plan = { template: "suffixed" as const, suffix: tionSuffix };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.syllables[1].stress).toBe("ˈ");
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
        prefixes: [simplePrefix],
        suffixes: [simpleSuffix],
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
      const plan = { template: "suffixed" as const, suffix: simpleSuffix };
      applyMorphology(rt, ctx, plan);
      expect(ctx.word.written.clean).toBe("dining");
    });
  });

  describe("maximal onset resyllabification", () => {
    it("-able syllables use maximal onset (/ə.bəl/ not /əb.əl/)", () => {
      const rt = makeRuntime();
      const ableSuffix: Affix = {
        type: "suffix", written: "able", phonemes: ["ə", "b", "ə", "l"],
        syllables: [{ onset: [], nucleus: ["ə"], coda: [] }, { onset: ["b"], nucleus: ["ə"], coda: ["l"] }],
        syllableCount: 2, stressEffect: "none", frequency: 40,
        boundaryTransforms: BT_ALL,
      };
      const ctx = makeContext(
        [makeSyllable(["t"], ["ɛ"], ["s", "t"])],
        "test",
      );
      const plan = { template: "suffixed" as const, suffix: ableSuffix };
      applyMorphology(rt, ctx, plan);
      const affixSyls = ctx.word.syllables.slice(1);
      expect(affixSyls[0].coda.length).toBe(0);
      expect(affixSyls[1].onset[0]?.sound).toBe("b");
    });
  });
});

// ---------------------------------------------------------------------------
// applyBoundaryTransforms unit tests
// ---------------------------------------------------------------------------

describe("applyBoundaryTransforms", () => {
  it("y-to-i transforms consonant+y endings", () => {
    expect(applyBoundaryTransforms("happy", [Y_TO_I])).toBe("happi");
  });

  it("y-to-i does NOT transform vowel+y endings", () => {
    expect(applyBoundaryTransforms("play", [Y_TO_I])).toBe("play");
  });

  it("drop-silent-e removes trailing e", () => {
    expect(applyBoundaryTransforms("bake", [DROP_SILENT_E])).toBe("bak");
  });

  it("double-consonant doubles final consonant after single vowel", () => {
    expect(applyBoundaryTransforms("stop", [DOUBLE_CONSONANT])).toBe("stopp");
  });

  it("double-consonant does not double after two vowels", () => {
    expect(applyBoundaryTransforms("boat", [DOUBLE_CONSONANT])).toBe("boat");
  });

  it("double-consonant does not double excluded consonants", () => {
    expect(applyBoundaryTransforms("lov", [DOUBLE_CONSONANT])).toBe("lov");
  });

  it("blockedBy prevents double-consonant when drop-silent-e fired", () => {
    const result = applyBoundaryTransforms("dine", [DROP_SILENT_E, DOUBLE_CONSONANT]);
    expect(result).toBe("din");
  });

  it("all three transforms together", () => {
    expect(applyBoundaryTransforms("happy", BT_ALL)).toBe("happi");
    expect(applyBoundaryTransforms("bake", BT_ALL)).toBe("bak");
    expect(applyBoundaryTransforms("stop", BT_ALL)).toBe("stopp");
  });

  it("transforms run in order", () => {
    expect(applyBoundaryTransforms("cry", BT_ALL)).toBe("cri");
  });
});

// ---------------------------------------------------------------------------
// matchesPhonologicalCondition unit tests
// ---------------------------------------------------------------------------

describe("matchesPhonologicalCondition", () => {
  const voicelessStop = findPhoneme("p");
  const voicedStop = findPhoneme("b");
  const sibilant = findPhoneme("s");
  const affricate = findPhoneme("tʃ");
  const alveolarStop = findPhoneme("t");

  it("preceding + voiced=false matches voiceless phoneme (suffix context)", () => {
    const cond: PhonologicalCondition = { position: "preceding", voiced: false };
    expect(matchesPhonologicalCondition(cond, voicelessStop, false)).toBe(true);
    expect(matchesPhonologicalCondition(cond, voicedStop, false)).toBe(false);
  });

  it("preceding condition returns false in prefix context", () => {
    const cond: PhonologicalCondition = { position: "preceding", voiced: false };
    expect(matchesPhonologicalCondition(cond, voicelessStop, true)).toBe(false);
  });

  it("preceding + voiced=true matches voiced phoneme", () => {
    const cond: PhonologicalCondition = { position: "preceding", voiced: true };
    expect(matchesPhonologicalCondition(cond, voicedStop, false)).toBe(true);
    expect(matchesPhonologicalCondition(cond, voicelessStop, false)).toBe(false);
  });

  it("manner constraint matches sibilant and affricate", () => {
    const cond: PhonologicalCondition = { position: "preceding", manner: ["sibilant", "affricate"] };
    expect(matchesPhonologicalCondition(cond, sibilant, false)).toBe(true);
    expect(matchesPhonologicalCondition(cond, affricate, false)).toBe(true);
    expect(matchesPhonologicalCondition(cond, voicelessStop, false)).toBe(false);
  });

  it("manner + place constraint matches alveolar stop", () => {
    const cond: PhonologicalCondition = { position: "preceding", manner: ["stop"], place: ["alveolar"] };
    expect(matchesPhonologicalCondition(cond, alveolarStop, false)).toBe(true);
    expect(matchesPhonologicalCondition(cond, voicelessStop, false)).toBe(false);
  });

  it("following + place constraint matches bilabial in prefix context", () => {
    const cond: PhonologicalCondition = { position: "following", place: ["bilabial"] };
    expect(matchesPhonologicalCondition(cond, voicedStop, true)).toBe(true);
    expect(matchesPhonologicalCondition(cond, alveolarStop, true)).toBe(false);
  });

  it("following condition returns false in suffix context", () => {
    const cond: PhonologicalCondition = { position: "following", place: ["bilabial"] };
    expect(matchesPhonologicalCondition(cond, voicedStop, false)).toBe(false);
  });
});

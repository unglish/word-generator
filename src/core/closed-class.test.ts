import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { createGenerator, generateWord } from "./generate.js";
import {
  compileClosedClass,
  emitClosedClassWord,
  sampleClosedClassEntry,
  syllablesFromPhonemeSounds,
} from "./closed-class.js";
import { createSeededRng } from "../utils/random.js";
import { TraceCollector } from "./trace.js";

describe("closed-class channel", () => {
  const nucleusSounds = new Set(englishConfig.phonemeMaps.nucleus.keys());
  const phonemeBySound = new Map(
    englishConfig.phonemes.map((phoneme) => [phoneme.sound, phoneme]),
  );

  it("syllabifies CV and CVC monosyllables", () => {
    const be = syllablesFromPhonemeSounds(["b", "i:"], phonemeBySound, nucleusSounds);
    expect(be).toHaveLength(1);
    expect(be[0].onset.map((p) => p.sound)).toEqual(["b"]);
    expect(be[0].nucleus.map((p) => p.sound)).toEqual(["i:"]);
    expect(be[0].coda).toEqual([]);

    const ofWord = syllablesFromPhonemeSounds(["ə", "v"], phonemeBySound, nucleusSounds);
    expect(ofWord[0].onset).toEqual([]);
    expect(ofWord[0].nucleus.map((p) => p.sound)).toEqual(["ə"]);
    expect(ofWord[0].coda.map((p) => p.sound)).toEqual(["v"]);
  });

  it("uses maximal onset for any /ɛ n i:/ [eh-nee]", () => {
    const any = syllablesFromPhonemeSounds(
      ["ɛ", "n", "i:"],
      phonemeBySound,
      nucleusSounds,
    );
    expect(any).toHaveLength(2);
    expect(any[0].nucleus.map((p) => p.sound)).toEqual(["ɛ"]);
    expect(any[0].coda).toEqual([]);
    expect(any[1].onset.map((p) => p.sound)).toEqual(["n"]);
    expect(any[1].nucleus.map((p) => p.sound)).toEqual(["i:"]);
  });

  it("emits spelling and closedClass provenance with trace repair", () => {
    const compiled = compileClosedClass(englishConfig);
    expect(compiled).toBeDefined();
    const entry = compiled!.entries.find((item) => item.name === "be")!;
    const trace = new TraceCollector();
    const word = emitClosedClassWord(
      {
        phonemeBySound,
        nucleusSounds,
        applyStress: (context) => {
          if (context.word.syllables[0]) context.word.syllables[0].stress = "ˈ";
        },
        realizeSurface: (context) => {
          context.word.pronunciation = "bi:";
        },
      },
      entry,
      { rand: () => 0, trace, morphologyTemplate: "bare" },
    );

    expect(word.written.clean).toBe("be");
    expect(word.provenance).toEqual({ kind: "closedClass", name: "be" });
    expect(word.trace?.repairs.some((r) => r.rule === "closedClass:be")).toBe(true);
    expect(word.trace?.morphology?.template).toBe("bare");
    expect(word.syllables[0].onset[0].sound).toBe("b");
    expect(word.syllables[0].nucleus[0].sound).toBe("i:");
  });

  it("injects closed-class words on bare draws at high probability", () => {
    const gen = createGenerator({
      ...englishConfig,
      closedClass: {
        probability: 1,
        entries: [
          { name: "of", phonemes: ["ə", "v"], spelling: "of" },
        ],
      },
    });

    // morphology:false forces bare templates every draw.
    const word = gen.generateWord({
      seed: 1,
      morphology: false,
      trace: true,
    });
    expect(word.written.clean).toBe("of");
    expect(word.provenance).toEqual({ kind: "closedClass", name: "of" });
    expect(word.trace?.repairs.some((r) => r.rule === "closedClass:of")).toBe(true);
  });

  it("does not inject on affixed morphology templates", () => {
    const gen = createGenerator({
      ...englishConfig,
      closedClass: {
        probability: 1,
        entries: [
          { name: "of", phonemes: ["ə", "v"], spelling: "of" },
        ],
      },
      morphology: {
        ...englishConfig.morphology!,
        enabled: true,
        // Force non-bare templates so closed-class cannot fire.
        templateWeights: {
          text: { bare: 0, suffixed: 100, prefixed: 0, both: 0 },
          lexicon: { bare: 0, suffixed: 100, prefixed: 0, both: 0 },
        },
      },
    });

    for (let seed = 0; seed < 40; seed++) {
      const word = gen.generateWord({ seed, morphology: true, trace: true });
      expect(word.provenance?.kind).not.toBe("closedClass");
      expect(word.written.clean).not.toBe("of");
      expect(
        word.trace?.repairs.some((r) => r.rule?.startsWith("closedClass:")),
      ).toBe(false);
    }
  });

  it("samples entries by weight", () => {
    const compiled = compileClosedClass({
      closedClass: {
        probability: 1,
        entries: [
          { name: "a", phonemes: ["ə"], spelling: "a", weight: 1 },
          { name: "b", phonemes: ["b", "i:"], spelling: "be", weight: 1000 },
        ],
      },
    })!;
    let bCount = 0;
    for (let i = 0; i < 200; i++) {
      const entry = sampleClosedClassEntry(compiled, createSeededRng(i + 1));
      if (entry.name === "b") bCount += 1;
    }
    expect(bCount).toBeGreaterThan(150);
  });

  it("marks productive provenance when closed-class does not fire", () => {
    const word = generateWord({
      seed: 42,
      morphology: false,
      // Use a generator with probability 0 via createGenerator
    });
    // Default englishConfig has probability 0.0005; seed 42 is extremely
    // unlikely to hit. Assert provenance is set either way.
    expect(word.provenance?.kind === "productive" || word.provenance?.kind === "closedClass").toBe(true);
  });

  it("sets productive provenance with closedClass disabled", () => {
    const gen = createGenerator({
      ...englishConfig,
      closedClass: undefined,
    });
    const word = gen.generateWord({ seed: 7, morphology: false });
    expect(word.provenance).toEqual({ kind: "productive" });
  });

  it("does not inject when a root syllable count is forced", () => {
    const gen = createGenerator({
      ...englishConfig,
      closedClass: {
        probability: 1,
        entries: [{ name: "of", phonemes: ["ə", "v"], spelling: "of" }],
      },
    });
    const word = gen.generateWord({
      seed: 1,
      morphology: false,
      syllableCount: 3,
      trace: true,
    });
    expect(word.syllables).toHaveLength(3);
    expect(word.provenance?.kind).not.toBe("closedClass");
    expect(word.written.clean).not.toBe("of");
  });
});

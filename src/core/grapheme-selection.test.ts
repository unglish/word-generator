import { describe, expect, it } from "vitest";
import { createGenerator, generateWord, createSeededRng } from "../index.js";
import { englishConfig } from "../config/english.js";
import { buildGraphemeMaps } from "../elements/graphemes/index.js";
import type { Grapheme } from "../types.js";
import { filterByPosition } from "./write.js";

function withGraphemes(graphemes: Grapheme[]) {
  return createGenerator({ ...englishConfig, graphemes, ...buildGraphemeMaps(graphemes) });
}

describe("legal grapheme selection", () => {
  it("rejects impossible hard conditions instead of restoring banned candidates", () => {
    const gen = withGraphemes(englishConfig.graphemes.map(g => ({
      ...g, condition: { leftContext: [] },
    })));
    expect(() => gen.generateWord({ seed: 38, morphology: false, trace: true }))
      .toThrow(/No legal grapheme.*no-conditioned-candidates/);
  });

  it("rejects zero singleton weights without privileging the final array item", () => {
    const graphemes = englishConfig.graphemes.map(g => ({ ...g, frequency: 0 }));
    for (const inventory of [graphemes, [...graphemes].reverse()]) {
      expect(() => withGraphemes(inventory).generateWord({ seed: 661, morphology: false }))
        .toThrow(/No legal grapheme.*no-positive-weights/);
    }
  });

  it("rejects invalid numerical weights at construction, even for singleton pools", () => {
    for (const frequency of [-1, NaN, Infinity]) {
      expect(() => withGraphemes(englishConfig.graphemes.map(g => ({ ...g, frequency }))))
        .toThrow(/Invalid grapheme weight/);
    }
  });

  it("does not use a fallback whose own hard condition fails", () => {
    const graphemes = englishConfig.graphemes.map(g => ({ ...g, frequency: 0 }));
    const fallbacks = englishConfig.graphemes.map(g => ({
      ...g, fallbackOnly: true, condition: { leftContext: [] },
    }));
    expect(() => withGraphemes([...graphemes, ...fallbacks]).generateWord({ seed: 661, morphology: false }))
      .toThrow(/No legal grapheme/);
  });

  it("uses a separately declared fallback and records the ordinary empty set", () => {
    const word = generateWord({ seed: 99, morphology: false, trace: true });
    const choice = word.trace!.graphemeSelections.find(g => g.selection?.fallback);
    expect(choice).toMatchObject({
      phoneme: "ɛ", selected: "ea", weights: [["ea", 140]],
      selection: { afterCondition: 1, afterPosition: 0, positiveCandidates: 0, fallback: "no-positional-candidates" },
    });
  });

  it("keeps isolated-syllable licensing explicit rather than overriding edge bans", () => {
    const grapheme: Grapheme = {
      phoneme: "test", form: "x", frequency: 1, origin: 0,
      startWord: 0, midWord: 10, endWord: 10, positionScope: "syllable",
    };
    expect(filterByPosition([grapheme], false, true, true)).toEqual([]);
    expect(filterByPosition([{ ...grapheme, isolatedSyllableWeight: 10 }], false, true, true)).toHaveLength(1);
    expect(filterByPosition([{ ...grapheme, isolatedSyllableWeight: 0 }], false, true, true)).toEqual([]);
  });

  it("retains the established isolated /ɛ/ pool while keeping the /t/ restriction explicit", () => {
    const rand = createSeededRng(217);
    let ordinary = 0;
    let fallback = 0;
    for (let draw = 0; draw < 2000; draw++) {
      const word = generateWord({ rand, syllableCount: 1, morphology: false, trace: true });
      const choices = word.trace!.graphemeSelections;
      for (let index = 0; index < choices.length; index++) {
        const choice = choices[index];
        if (choice.phoneme !== "ɛ") continue;
        if (choices[index + 1]?.phoneme === "t") {
          fallback++;
          expect(choice.selected).toBe("ea");
          expect(choice.selection?.fallback).toBe("no-positional-candidates");
        } else {
          ordinary++;
          expect(choice.selected).toBe("e");
          expect(choice.selection?.fallback).toBeUndefined();
        }
      }
    }
    expect(ordinary).toBeGreaterThan(0);
    expect(fallback).toBeGreaterThan(0);
  });

  it("is deterministic and trace collection leaves RNG consumption unchanged", () => {
    for (let seed = 0; seed < 40; seed++) {
      const plain = generateWord({ seed, morphology: false });
      const traced = generateWord({ seed, morphology: false, trace: true });
      expect(traced.written).toEqual(plain.written);
      expect(traced.pronunciation).toBe(plain.pronunciation);
      expect(generateWord({ seed, morphology: false, trace: true })).toEqual(traced);
    }
  });

  it("keeps positive real weights and correct edge scopes across 10k public outputs", () => {
    const rand = createSeededRng(20260926);
    let firstSyllableCodas = 0;
    let finalSyllableOnsets = 0;
    let singletonWeightsOtherThanOne = 0;
    let fallbackChoices = 0;
    for (let draw = 0; draw < 10000; draw++) {
      const word = generateWord({ rand, morphology: false, trace: true });
      const choices = word.trace!.graphemeSelections;
      for (const choice of choices) {
        expect(choice.weights.length).toBeGreaterThan(0);
        expect(choice.weights.every(([, weight]) => weight > 0 && Number.isFinite(weight))).toBe(true);
        const selection = choice.selection!;
        if (choice.weights.length === 1 && choice.weights[0][1] !== 1) singletonWeightsOtherThanOne++;
        if (selection.fallback) {
          fallbackChoices++;
          expect(selection.positiveCandidates).toBe(0);
          expect([["ɛ", "ea"], ["ʊ", "oo"]]).toContainEqual([choice.phoneme, choice.selected]);
        }
        if (choice.syllableIndex === 0 && choice.position === "coda" && word.syllables.length > 1) {
          firstSyllableCodas++;
          expect(selection.segmentPosition).toBe("medial");
          expect(selection.positionScope).toBe(choice.selected === "ck" ? "syllable" : "segment");
        }
        if (choice.syllableIndex === word.syllables.length - 1 && choice.position === "onset" && word.syllables.length > 1) {
          finalSyllableOnsets++;
          expect(selection.segmentPosition).toBe("medial");
          expect(selection.positionScope).toBe("segment");
        }
      }
    }
    expect(firstSyllableCodas).toBeGreaterThan(1000);
    expect(finalSyllableOnsets).toBeGreaterThan(1000);
    expect(singletonWeightsOtherThanOne).toBeGreaterThan(1000);
    expect(fallbackChoices).toBeGreaterThan(0);
  });
});

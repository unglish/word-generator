import { describe, expect, it } from "vitest";
import { compareDistributions, toPercentMap } from "./distribution-quality.js";
import { computePhonemeQualityMetrics } from "./phoneme-quality.js";
import { countNormalizedPhonemes, normalizeGeneratedPhoneme } from "./phoneme-normalization.js";
import type { Word } from "../types.js";

describe("complete distribution diagnostics", () => {
  it("retains IPA letters outside the IPA Unicode block and reports invalid tokens", () => {
    for (const sound of ["æ", "ð", "θ", "ŋ", "eɪ", "i:"]) expect(normalizeGeneratedPhoneme(sound, {})).toBe(sound);
    expect(normalizeGeneratedPhoneme("tʰ", {})).toBe("t");
    expect(normalizeGeneratedPhoneme("ə", { generatedAliases: { "ə": "ʌ" } })).toBe("ʌ");
    expect(normalizeGeneratedPhoneme("?", {})).toBeNull();
  });
  it("counts every syllable position and keeps rejected tokens separate", () => {
    const phones = (...sounds: string[]) => sounds.map(sound => ({ sound }));
    const word = {
      syllables: [
        { onset: phones("tʰ"), nucleus: phones("æ"), coda: phones("n") },
        { onset: phones("?"), nucleus: phones("ə"), coda: phones("t") },
      ],
    } as unknown as Word;
    expect(countNormalizedPhonemes([word], {})).toEqual({
      counts: { t: 2, "æ": 1, n: 1, "ə": 1 },
      losses: { "?": 1 },
    });
  });
  it("retains absent reference phones in rankings and distance", () => {
    const result = computePhonemeQualityMetrics({ a: 60, b: 39 }, { a: 60, b: 39, c: 1 }, 0.5);
    expect(result.sharedPearsonR).toBeCloseTo(1);
    expect(result.topUnderRepresented[0]).toMatchObject({ phoneme: "c", generatedPct: 0, baselinePct: 1, ratio: 0 });
    expect(result.missingReferenceMassPct).toBeCloseTo(1);
    expect(result.jensenShannonBits).toBeGreaterThan(0);
    expect(result.unionPearsonR).toBeLessThan(1);
    expect(result.cmuOnlyKeyCount).toBe(1);
  });

  it("treats explicit zero counts as absence", () => {
    const generated = { a: 60, b: 39, c: 0 };
    const baseline = { a: 60, b: 39, c: 1 };
    const result = computePhonemeQualityMetrics(generated, baseline, 0.5);
    expect(result.sharedKeyCount).toBe(2);
    expect(result.cmuOnlyKeyCount).toBe(1);
    expect(result.missingReferenceMassPct).toBeCloseTo(1);
  });

  it("scores identity and disjoint inventories without dropping generated-only mass", () => {
    expect(compareDistributions({ a: 2, b: 1 }, { a: 4, b: 2 }).jensenShannonBits).toBe(0);
    expect(compareDistributions({ x: 1 }, { y: 1 })).toMatchObject({ jensenShannonBits: 1, missingReferenceMassPct: 100, nonReferenceMassPct: 100 });
    expect(compareDistributions({}, { y: 1 })).toMatchObject({ jensenShannonBits: null, missingReferenceMassPct: 100 });
    expect(compareDistributions({}, {}).jensenShannonBits).toBeNull();
    const known = compareDistributions({ a: 1, b: 1 }, { a: 1 }).jensenShannonBits;
    expect(known).toBeCloseTo(0.31127812445913283, 12);
    expect(compareDistributions({ a: 1 }, { a: 100, b: 100 }).jensenShannonBits).toBeCloseTo(known!, 12);
  });

  it("rejects invalid counts and normalizes large finite counts without overflow", () => {
    expect(toPercentMap({ a: Number.MAX_VALUE, b: Number.MAX_VALUE })).toEqual({ a: 50, b: 50 });
    for (const value of [-1, NaN, Infinity]) expect(() => compareDistributions({ a: value }, { a: 1 })).toThrow();
  });
});

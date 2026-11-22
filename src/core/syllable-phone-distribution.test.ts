import { describe, expect, it } from "vitest";
import { generateWords } from "../index.js";
import { lexiconReference } from "../config/lexicon-reference.js";
import { totalVariationPct, toPercentMap } from "./distribution-quality.js";

const SEEDS = [42, 43, 44] as const;
const SAMPLE = 40_000;

describe("lexicon root length distribution", () => {
  it.each(SEEDS)("preserves the fitted phone and syllable budgets with seed %i", (seed) => {
    const expected: Record<string, number> = {};
    for (const [phones, masses] of Object.entries(lexiconReference.rootLengths)) {
      for (const [syllables, mass] of Object.entries(masses)) {
        expected[`${phones},${syllables}`] = mass;
      }
    }

    const observed: Record<string, number> = {};
    for (const word of generateWords(SAMPLE, { seed, mode: "lexicon", morphology: false })) {
      const phones = word.syllables.reduce((total, s) =>
        total + s.onset.length + s.nucleus.length + s.coda.length, 0);
      const key = `${phones},${word.syllables.length}`;
      observed[key] = (observed[key] ?? 0) + 1;
    }
    // Allow modest sampling and target-selection fallback differences.
    expect(totalVariationPct(toPercentMap(observed), toPercentMap(expected))).toBeLessThan(2.5);
  }, 60_000);
});

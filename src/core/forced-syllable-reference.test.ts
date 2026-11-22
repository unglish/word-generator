import { describe, expect, it } from "vitest";
import { generateWords } from "../index.js";
import { lexiconReference } from "../config/lexicon-reference.js";
import { totalVariationPct, toPercentMap } from "./distribution-quality.js";

const SAMPLE = 20_000;

describe("forced syllable lengths", () => {
  it.each([{ syllableCount: 1, seed: 1302 }, { syllableCount: 2, seed: 1304 }])(
    "keeps $syllableCount-syllable roots near the corpus conditional",
    ({ syllableCount, seed }) => {
      const expected: Record<string, number> = {};
      for (const [phones, masses] of Object.entries(lexiconReference.rootLengths)) {
        const bySyllables: Record<number, number> = masses;
        expected[phones] = bySyllables[syllableCount] ?? 0;
      }

      const observed: Record<string, number> = {};
      let heavyMonoCodas = 0;
      const words = generateWords(SAMPLE, { seed, syllableCount, mode: "lexicon", morphology: false });
      for (const word of words) {
        expect(word.syllables).toHaveLength(syllableCount);
        const phones = word.syllables.reduce((total, s) =>
          total + s.onset.length + s.nucleus.length + s.coda.length, 0);
        observed[phones] = (observed[phones] ?? 0) + 1;
        if (syllableCount === 1 && word.syllables[0].coda.length >= 3) heavyMonoCodas++;
      }
      // Uniformly reweighting a root-syllable bucket must preserve the measured
      // phone distribution conditional on that syllable count.
      expect(totalVariationPct(toPercentMap(observed), toPercentMap(expected))).toBeLessThan(2.5);
      expect(heavyMonoCodas / SAMPLE).toBeLessThan(0.1);
    },
  );
});

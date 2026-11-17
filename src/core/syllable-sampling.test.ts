import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import {
  phonemeLengthWeightsForForcedSyllables,
  syllableCountSamplingWeights,
  syllableShare,
} from "./syllable-sampling.js";

describe("syllableCountSamplingWeights", () => {
  // Deliberately does not assert "returns the config row unchanged" as a pin
  // against letter-peak reweighting: that would still pass if reweighting were
  // applied after this helper at the sample site. The live distribution pin is
  // `syllable-phone-distribution.test.ts`.

  it("throws when the phoneme count is absent", () => {
    expect(() =>
      syllableCountSamplingWeights(
        englishConfig.phonemeToSyllableWeights.lexicon,
        99,
      ),
    ).toThrow(/Missing phonemeToSyllableWeights entry/);
  });
});

describe("phonemeLengthWeightsForForcedSyllables", () => {
  it("conditions only via syllableShare (no letter-peak factor)", () => {
    const phonemeLengthWeights = englishConfig.phonemeLengthWeights.lexicon;
    const table = englishConfig.phonemeToSyllableWeights.lexicon;
    const forcedSyllableCount = 1;
    const maxPhonemes = 12;

    const weights = phonemeLengthWeightsForForcedSyllables(
      phonemeLengthWeights,
      table,
      forcedSyllableCount,
      maxPhonemes,
    );

    const expected = phonemeLengthWeights
      .filter(
        ([phonemeCount]) =>
          phonemeCount >= forcedSyllableCount && phonemeCount <= maxPhonemes,
      )
      .map(
        ([phonemeCount, weight]): [number, number] => [
          phonemeCount,
          weight * syllableShare(table[phonemeCount], forcedSyllableCount),
        ],
      )
      .filter(([, weight]) => weight > 0);

    expect(weights).toEqual(expected);

    // Spot-check: for 4 phones, lexicon P(1 syl)≈0.4227 so the share is not 1
    // and is not multiplied by any letter-peak boost.
    const four = weights.find(([n]) => n === 4);
    const baseFour = phonemeLengthWeights.find(([n]) => n === 4)?.[1];
    expect(four).toBeDefined();
    expect(baseFour).toBeDefined();
    expect(four![1]).toBeCloseTo(baseFour! * syllableShare(table[4], 1), 10);
  });
});

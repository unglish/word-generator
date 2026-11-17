import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import {
  normalizeWeightPairs,
  phonemeLengthWeightsForForcedSyllables,
  syllableCountSamplingWeights,
  syllableShare,
} from "./syllable-sampling.js";

function assertMatchesNormalisedTable(
  mode: "text" | "lexicon",
  phonemeCount: number,
): void {
  const table = englishConfig.phonemeToSyllableWeights[mode];
  const raw = table[phonemeCount];
  expect(raw?.length).toBeGreaterThan(0);

  const sampling = syllableCountSamplingWeights(table, phonemeCount);
  expect(sampling).toEqual(raw);

  const expected = normalizeWeightPairs(raw);
  const actual = normalizeWeightPairs(sampling);
  expect([...actual.entries()]).toEqual([...expected.entries()]);

  // No letter-peak-style reweighting: relative ratios among positive entries
  // match the config table exactly.
  for (let i = 0; i < raw.length; i++) {
    expect(sampling[i][0]).toBe(raw[i][0]);
    expect(sampling[i][1]).toBe(raw[i][1]);
  }
}

describe("syllableCountSamplingWeights", () => {
  it("matches normalised phonemeToSyllableWeights for English lexicon mode", () => {
    for (const phonemeCount of Object.keys(
      englishConfig.phonemeToSyllableWeights.lexicon,
    ).map(Number)) {
      assertMatchesNormalisedTable("lexicon", phonemeCount);
    }
  });

  it("matches normalised phonemeToSyllableWeights for English text mode", () => {
    for (const phonemeCount of Object.keys(
      englishConfig.phonemeToSyllableWeights.text,
    ).map(Number)) {
      assertMatchesNormalisedTable("text", phonemeCount);
    }
  });

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

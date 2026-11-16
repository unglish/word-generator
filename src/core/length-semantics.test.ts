import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { LETTER_LENGTH_TARGETS } from "../config/weights.js";
import { createSeededRng } from "../utils/random.js";
import { createGenerator, generateWord } from "./generate.js";
import {
  isDecidedRejection,
  letterPeakSamplingWeight,
  scoreGenerationAttempt,
  scoreLetterLength,
} from "./length-semantics.js";

describe("letterPeakSamplingWeight", () => {
  const targets: Record<number, [number, number, number, number]> = {
    2: [4, 6, 8, 10],
  };

  it("is neutral when letter targets are absent", () => {
    expect(letterPeakSamplingWeight(5, 2, undefined)).toBe(1);
  });

  it("boosts phoneme/syllable pairs whose expected letters land in the peak", () => {
    // 6 phonemes × 1.15 ≈ 6.9 letters → inside [6, 8]
    expect(letterPeakSamplingWeight(6, 2, targets)).toBe(2);
    // 4 phonemes × 1.15 ≈ 4.6 → short of peak by 1.4
    expect(letterPeakSamplingWeight(4, 2, targets)).toBeCloseTo(1 / (1 + 1.4), 5);
  });
});

describe("monosyllable letter-length targets", () => {
  it("lets a 2-letter monosyllable pass the relaxed letter gate", () => {
    // peakMin 3 → len 2 is edgeDistance 1 → penalty 0.5 ≤ relaxedLetterPenalty
    expect(LETTER_LENGTH_TARGETS[1]).toEqual([2, 3, 7, 8]);
    expect(scoreLetterLength(2, 1, LETTER_LENGTH_TARGETS)).toBe(0.5);
    expect(scoreLetterLength(3, 1, LETTER_LENGTH_TARGETS)).toBe(0);
    expect(scoreLetterLength(2, 1, { 1: [2, 4, 6, 8] })).toBe(1);
  });

  it("is deterministic for a fixed seed under the monosyllable row", () => {
    const first = generateWord({
      rand: createSeededRng(85),
      mode: "lexicon",
      morphology: true,
    });
    const second = generateWord({
      rand: createSeededRng(85),
      mode: "lexicon",
      morphology: true,
    });
    expect(second.written.clean).toBe(first.written.clean);
    expect(second.syllables.map((syllable) => ({
      onset: syllable.onset.map((phoneme) => phoneme.sound),
      nucleus: syllable.nucleus.map((phoneme) => phoneme.sound),
      coda: syllable.coda.map((phoneme) => phoneme.sound),
    }))).toEqual(first.syllables.map((syllable) => ({
      onset: syllable.onset.map((phoneme) => phoneme.sound),
      nucleus: syllable.nucleus.map((phoneme) => phoneme.sound),
      coda: syllable.coda.map((phoneme) => phoneme.sound),
    })));
  });

  it("raises the share of short bare monosyllables versus the old peak-at-4 row", () => {
    const sample = 20_000;
    const shortShare = (row: [number, number, number, number]) => {
      const generator = createGenerator({
        ...englishConfig,
        syllableStructure: {
          ...englishConfig.syllableStructure,
          letterLengthTargets: { ...LETTER_LENGTH_TARGETS, 1: row },
        },
      });
      const rand = createSeededRng(42);
      let monosyllables = 0;
      let short = 0;
      for (let index = 0; index < sample; index++) {
        const word = generator.generateWord({
          rand,
          mode: "lexicon",
          morphology: false,
        });
        if (word.syllables.length !== 1) continue;
        monosyllables += 1;
        if (word.written.clean.length <= 3) short += 1;
      }
      expect(monosyllables).toBeGreaterThan(1000);
      return short / monosyllables;
    };

    const previous = shortShare([2, 4, 6, 8]);
    const calibrated = shortShare([2, 3, 7, 8]);
    expect(calibrated).toBeGreaterThan(previous);
    expect(calibrated).toBeGreaterThan(0.1);
  });
});

describe("isDecidedRejection", () => {
  it("never decides an attempt that hits its phoneme target", () => {
    expect(isDecidedRejection(0, 0)).toBe(false);
    expect(isDecidedRejection(0, Infinity)).toBe(false);
  });

  it("never decides the first attempt, which always becomes the fallback", () => {
    expect(isDecidedRejection(5, Infinity)).toBe(false);
  });

  it("decides a miss only when even a perfect spelling could not beat the best score", () => {
    expect(isDecidedRejection(1, 2)).toBe(true);
    expect(isDecidedRejection(1, 1.5)).toBe(true);
    expect(isDecidedRejection(1, 2.5)).toBe(false);
  });

  it("matches the score bound for every letter length", () => {
    const targets: Record<number, [number, number, number, number]> = { 2: [4, 5, 7, 9] };
    for (const best of [0.5, 2, 3, 4.5, 6]) {
      for (let letters = 0; letters <= 15; letters++) {
        const score = scoreGenerationAttempt(8, 6, letters, 2, targets);
        // A decided attempt must never be able to replace the best (strictly lower total).
        if (isDecidedRejection(score.phonemeDistance, best)) expect(score.total < best).toBe(false);
      }
    }
  });
});

import { describe, expect, it } from "vitest";
import { englishConfig } from "../config/english.js";
import { LETTER_LENGTH_TARGETS } from "../config/weights.js";
import { createSeededRng } from "../utils/random.js";
import { createGenerator } from "./generate.js";
import {
  assessAttempt,
  isDecidedRejection,
  letterPeakSamplingWeight,
  resolveLetterLengthAcceptance,
  scoreGenerationAttempt,
  scoreLetterLength,
  type AcceptanceCriteria,
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

describe("letterLengthRelaxedAfter acceptance", () => {
  const globalCriteria: AcceptanceCriteria = {
    warmupAttempts: 3,
    relaxedLetterPenalty: 0.5,
  };
  const monoTargets = { 1: [2, 4, 6, 8] as [number, number, number, number] };

  it("leaves band scoring unchanged when the override map is absent", () => {
    // Length 2 is two steps below peakMin 4 → edgeDistance 2 → penalty 1.
    expect(scoreLetterLength(2, 1, monoTargets)).toBe(1);
    expect(scoreLetterLength(3, 1, monoTargets)).toBe(0.5);
    expect(scoreLetterLength(4, 1, monoTargets)).toBe(0);
  });

  it("keeps global criteria when the shape is not listed", () => {
    const score = scoreGenerationAttempt(3, 3, 2, 1, monoTargets);
    expect(score.letterPenalty).toBe(1);
    const criteria = resolveLetterLengthAcceptance(
      globalCriteria,
      1,
      2,
      score.letterPenalty,
      undefined,
    );
    expect(criteria).toEqual(globalCriteria);
    expect(assessAttempt(score, 5, criteria).acceptedBy).toBeNull();
  });

  it("allows relaxed accept from attempt N for a listed in-band shape without changing the band penalty", () => {
    const score = scoreGenerationAttempt(3, 3, 2, 1, monoTargets);
    expect(score.letterPenalty).toBe(1);
    const criteria = resolveLetterLengthAcceptance(
      globalCriteria,
      1,
      2,
      score.letterPenalty,
      { 1: { 2: 5 } },
      monoTargets,
    );
    expect(criteria.warmupAttempts).toBe(5);
    expect(criteria.relaxedLetterPenalty).toBe(1);
    expect(assessAttempt(score, 4, criteria).acceptedBy).toBeNull();
    expect(assessAttempt(score, 5, criteria).acceptedBy).toBe("relaxed");
  });

  it("ignores the override for lengths outside the outer letter band", () => {
    const impossible: Record<number, [number, number, number, number]> = {
      1: [1000, 1000, 1000, 1000],
    };
    const score = scoreGenerationAttempt(3, 3, 2, 1, impossible);
    expect(score.letterPenalty).toBeGreaterThan(1);
    const criteria = resolveLetterLengthAcceptance(
      globalCriteria,
      1,
      2,
      score.letterPenalty,
      { 1: { 2: 0 } },
      impossible,
    );
    expect(criteria).toEqual(globalCriteria);
    expect(assessAttempt(score, 5, criteria).acceptedBy).toBeNull();
  });
});

describe("English letterLengthRelaxedAfter distribution", () => {
  it("keeps bare-monosyllable 2- and 3-letter shares near CMU", () => {
    // CMU bySylLen[1]: 2-letter 1.293%, 3-letter 8.154%. Bounds are ±25% relative,
    // widened slightly for a 50k-draw seed-42 sample.
    const generator = createGenerator(englishConfig);
    const rand = createSeededRng(42);
    const byLength: Record<number, number> = {};
    let monosyllables = 0;
    for (let i = 0; i < 50_000; i++) {
      const word = generator.generateWord({
        rand,
        mode: "lexicon",
        morphology: false,
      });
      if (word.syllables.length !== 1) continue;
      monosyllables += 1;
      const letters = word.written.clean.length;
      byLength[letters] = (byLength[letters] ?? 0) + 1;
    }
    expect(monosyllables).toBeGreaterThan(5_000);
    const p2 = (byLength[2] ?? 0) / monosyllables;
    const p3 = (byLength[3] ?? 0) / monosyllables;
    expect(p2).toBeGreaterThan(0.007);
    expect(p2).toBeLessThan(0.020);
    expect(p3).toBeGreaterThan(0.050);
    expect(p3).toBeLessThan(0.110);
  });

  it("pins a fixed-seed spelling that diverges if the override schedule changes", () => {
    expect(LETTER_LENGTH_TARGETS[1]).toEqual([2, 4, 6, 8]);
    expect(englishConfig.syllableStructure.letterLengthRelaxedAfter).toEqual({
      1: { 2: 5 },
    });
    const generator = createGenerator(englishConfig);
    const rand = createSeededRng(99);
    const spellings: string[] = [];
    for (let i = 0; i < 105; i++) {
      spellings.push(
        generator.generateWord({
          rand,
          mode: "lexicon",
          morphology: true,
        }).written.clean,
      );
    }
    // Index 104 is the first divergence vs absent-override main under this seed.
    expect(spellings[104]).toBe("overod");
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

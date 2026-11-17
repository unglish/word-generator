import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig } from "../index.js";
import { findExample } from "../test-support/find-example.js";
import { createSeededRng } from "../utils/random.js";
import {
  assessAttempt,
  isDecidedRejection,
  resolveLetterLengthAcceptance,
  scoreGenerationAttempt,
  scoreLetterLength,
  type AcceptanceCriteria,
} from "./length-semantics.js";

describe("letterLengthRelaxedAfter acceptance", () => {
  const globalCriteria: AcceptanceCriteria = {
    warmupAttempts: 3,
    relaxedLetterPenalty: 0.5,
  };
  const monoTargets: Record<number, [number, number, number, number]> = { 1: [2, 4, 6, 8] };

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

  it("accepts a traced two-letter root earlier with the schedule than without it", () => {
    const generator = createGenerator({
      ...englishConfig,
      syllableStructure: { ...englishConfig.syllableStructure, letterLengthRelaxedAfter: undefined },
    });
    const { word, options } = findExample(word => {
      const selection = word.trace?.selection;
      return selection?.acceptedBy === "relaxed" && selection.selected.letters === 2
        && selection.attemptsExecuted < selection.criteria.maxAttempts;
    }, {
      property: "a two-letter root accepted before the retry limit",
      limit: 2_000,
      options: { mode: "lexicon", syllableCount: 1, morphology: false },
    });
    const selection = word.trace!.selection!;
    expect(selection.criteria).toMatchObject({ warmupAttempts: 5, relaxedLetterPenalty: 1 });
    expect(selection.selected.score).toMatchObject({ phonemeDistance: 0, letterPenalty: 1 });
    expect(selection.selectedAttempt).toBeGreaterThanOrEqual(5);

    const baseline = generator.generateWord(options).trace!.selection!;
    expect(baseline.criteria).toMatchObject({ warmupAttempts: 3, relaxedLetterPenalty: 0.5 });
    expect(baseline.attemptsExecuted).toBeGreaterThan(selection.attemptsExecuted);
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

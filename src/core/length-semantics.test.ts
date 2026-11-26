import { describe, expect, it } from "vitest";
import { createGenerator, englishConfig, type LanguageConfig } from "../index.js";
import { findExample } from "../test-support/find-example.js";
import { createSeededRng } from "../utils/random.js";
import {
  assessAttempt,
  isDecidedRejection,
  scoreGenerationAttempt,
  scoreLetterLength,
  type AcceptanceCriteria,
} from "./length-semantics.js";

function generatorWithLengthRules(rules: Partial<LanguageConfig["syllableStructure"]>) {
  return createGenerator({
    ...englishConfig,
    syllableStructure: { ...englishConfig.syllableStructure, ...rules },
  });
}

describe("letterLengthRelaxedAfter configuration", () => {
  it.each([
    [{ "01": { 2: 5 } }, /invalid syllable-count key/],
    [{ 1: { "02": 5 } }, /invalid letter-length key/],
    [{ 1: { 2: 20 } }, /attempt index/],
    [{ 1: { 1: 5 } }, /outside the letter-length band/],
  ])("rejects an unusable schedule %j", (letterLengthRelaxedAfter, message) => {
    expect(() => generatorWithLengthRules({ letterLengthRelaxedAfter })).toThrow(message);
  });

  it("rejects a schedule without letter-length targets", () => {
    expect(() => generatorWithLengthRules({ letterLengthTargets: undefined })).toThrow(/requires letterLengthTargets/);
  });

  it("keeps a root already eligible under the global policy", () => {
    const letterLengthTargets: LanguageConfig["syllableStructure"]["letterLengthTargets"] = { 1: [2, 3, 6, 8] };
    const baseline = generatorWithLengthRules({ letterLengthTargets, letterLengthRelaxedAfter: undefined });
    const scheduled = generatorWithLengthRules({ letterLengthTargets });
    const { word, options } = findExample(word => {
      const selection = word.trace!.selection!;
      return selection.acceptedBy === "relaxed" && selection.selected.letters === 2
        && selection.selectedAttempt < 5;
    }, {
      generator: baseline,
      property: "a two-letter root that passes global acceptance before attempt 5",
      limit: 500,
      options: { syllableCount: 1, morphology: false },
    });
    expect(scheduled.generateWord(options)).toEqual(word);
  });

  it("counts rejections against the published global thresholds", () => {
    const baseline = generatorWithLengthRules({ letterLengthRelaxedAfter: undefined });
    const { word, options } = findExample(word => {
      const selection = word.trace!.selection!;
      return selection.acceptedBy === "exact" && selection.selectedAttempt === 4
        && selection.proposedLengths.some(bin => bin.syllables === 1 && bin.letters === 2);
    }, {
      generator: baseline,
      property: "an exact match that follows a two-letter rejection before the schedule opens",
      limit: 100,
      options: { syllableCount: 1, morphology: false },
    });
    expect(generatorWithLengthRules({}).generateWord(options).trace!.selection).toEqual(word.trace!.selection);
  });
});

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

  it("opens relaxed acceptance at the scheduled index", () => {
    const score = scoreGenerationAttempt(3, 3, 2, 1, monoTargets);
    expect(score.letterPenalty).toBe(1);
    expect(assessAttempt(score, 5, globalCriteria).acceptedBy).toBeNull();
    expect(assessAttempt(score, 4, globalCriteria, 5).acceptedBy).toBeNull();
    expect(assessAttempt(score, 5, globalCriteria, 5)).toMatchObject({
      acceptedBy: "relaxed",
      scheduledRelaxedAfter: 5,
    });
    expect(assessAttempt(score, 0, globalCriteria, 0)).toMatchObject({
      acceptedBy: "relaxed",
      scheduledRelaxedAfter: 0,
    });
  });

  it("still requires the target phoneme count", () => {
    const score = scoreGenerationAttempt(2, 3, 2, 1, monoTargets);
    expect(assessAttempt(score, 5, globalCriteria, 5)).toMatchObject({
      acceptedBy: null,
      failed: { phonemeTarget: true, letterLength: true, warmup: false },
    });
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
    expect(selection.criteria).toMatchObject({ warmupAttempts: 3, relaxedLetterPenalty: 0.5 });
    expect(selection.scheduledRelaxedAfter).toBe(5);
    expect(selection.selected.score).toMatchObject({ phonemeDistance: 0, letterPenalty: 1 });
    expect(selection.selectedAttempt).toBeGreaterThanOrEqual(5);

    const baseline = generator.generateWord(options).trace!.selection!;
    expect(baseline.criteria).toEqual(selection.criteria);
    expect(baseline.scheduledRelaxedAfter).toBeUndefined();
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

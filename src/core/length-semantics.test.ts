import { describe, expect, it } from "vitest";
import { isDecidedRejection, scoreGenerationAttempt } from "./length-semantics.js";

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

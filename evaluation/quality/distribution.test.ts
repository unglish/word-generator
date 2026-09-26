import { describe, expect, it } from "vitest";
import { distributionDistance } from "./distribution.js";

describe("distributionDistance", () => {
  it("normalizes counts and weights to compare identical proportions", () => {
    expect(distributionDistance({ a: 10, b: 30 }, { a: 0.25, b: 0.75 })).toEqual({
      jensenShannonBits: 0,
      missingReferenceMass: 0,
      unseenGeneratedMass: 0,
    });
  });

  it("penalizes reference categories absent from generated output", () => {
    const score = distributionDistance({ a: 1 }, { a: 1, b: 1 });
    expect(score.jensenShannonBits).toBeCloseTo(0.31127812445913283, 14);
    expect(score.missingReferenceMass).toBe(0.5);
    expect(score.unseenGeneratedMass).toBe(0);
    expect(distributionDistance({ a: 1, b: 0 }, { a: 1, b: 1 })).toEqual(score);
  });

  it("gives disjoint distributions the maximum divergence of one bit", () => {
    expect(distributionDistance({ a: 2, b: 1 }, { c: 4 })).toEqual({
      jensenShannonBits: 1,
      missingReferenceMass: 1,
      unseenGeneratedMass: 1,
    });
  });

  it("is symmetric in divergence but swaps the directional coverage measures", () => {
    const left = { a: 1, b: 3 };
    const right = { b: 1, c: 1 };
    const forward = distributionDistance(left, right);
    const reverse = distributionDistance(right, left);
    expect(forward.jensenShannonBits).toBeCloseTo(reverse.jensenShannonBits!, 14);
    expect(forward.missingReferenceMass).toBe(0.5);
    expect(forward.unseenGeneratedMass).toBe(0.25);
    expect(reverse.missingReferenceMass).toBe(forward.unseenGeneratedMass);
    expect(reverse.unseenGeneratedMass).toBe(forward.missingReferenceMass);
  });

  it.each([
    [{}, {}],
    [{}, { a: 1 }],
    [{ a: 1 }, {}],
    [{ a: 0, b: 0 }, { a: 1 }],
    [{ a: 1 }, { a: 0, b: 0 }],
  ])("returns null metrics when either distribution has no positive mass", (generated, reference) => {
    expect(distributionDistance(generated, reference)).toEqual({
      jensenShannonBits: null,
      missingReferenceMass: null,
      unseenGeneratedMass: null,
    });
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "rejects invalid weight %s on either side even when the other side is empty",
    weight => {
      expect(() => distributionDistance({ bad: weight }, {})).toThrow("finite and nonnegative");
      expect(() => distributionDistance({}, { bad: weight })).toThrow("finite and nonnegative");
    },
  );

  it("ignores shared zero-mass categories and preserves categories such as __proto__", () => {
    const reference = Object.fromEntries([["__proto__", 1], ["unused", 0]]);
    const score = distributionDistance({ a: 1, unused: 0 }, reference);
    expect(score).toEqual({ jensenShannonBits: 1, missingReferenceMass: 1, unseenGeneratedMass: 1 });
  });

  it("normalizes finite extreme weights without overflowing their sum", () => {
    expect(distributionDistance({ a: Number.MAX_VALUE, b: Number.MAX_VALUE }, { a: 1, b: 1 })).toEqual({
      jensenShannonBits: 0,
      missingReferenceMass: 0,
      unseenGeneratedMass: 0,
    });
    const tiny = distributionDistance({ a: Number.MIN_VALUE, b: 1 }, { b: 1 });
    expect(Number.isFinite(tiny.jensenShannonBits)).toBe(true);
    expect(tiny.unseenGeneratedMass).toBe(Number.MIN_VALUE);
  });

  it("keeps nearly identical distributions inside the mathematical zero-to-one range", () => {
    const score = distributionDistance({ a: 1, b: 3 }, { a: 1 + 1e-12, b: 3 });
    expect(score.jensenShannonBits).toBeGreaterThanOrEqual(0);
    expect(score.jensenShannonBits).toBeLessThan(1e-14);
  });
});

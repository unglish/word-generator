import { describe, it, expect } from "vitest";
import getWeightedOption from "./getWeightedOption";
import { createSeededRng, RNG } from "./random";

describe("getWeightedOption", () => {
  it("uses the provided RNG (not global state)", () => {
    // Two identical RNGs should produce the same sequence of choices
    const rngA = createSeededRng(42);
    const rngB = createSeededRng(42);

    const options: [string, number][] = [["a", 10], ["b", 30], ["c", 60]];

    const resultsA = Array.from({ length: 100 }, () => getWeightedOption(options, rngA));
    const resultsB = Array.from({ length: 100 }, () => getWeightedOption(options, rngB));

    expect(resultsA).toEqual(resultsB);
  });

  it("different RNGs produce different sequences", () => {
    const rngA = createSeededRng(42);
    const rngB = createSeededRng(99);

    const options: [string, number][] = [["a", 10], ["b", 30], ["c", 60]];

    const resultsA = Array.from({ length: 50 }, () => getWeightedOption(options, rngA));
    const resultsB = Array.from({ length: 50 }, () => getWeightedOption(options, rngB));

    expect(resultsA.join("")).not.toBe(resultsB.join(""));
  });

  it("respects weights — high-weight option selected most often", () => {
    const rng = createSeededRng(123);
    const options: [string, number][] = [["rare", 1], ["common", 99]];
    const N = 10_000;

    let commonCount = 0;
    for (let i = 0; i < N; i++) {
      if (getWeightedOption(options, rng) === "common") commonCount++;
    }

    // 99% weight should give ~99% hits. Allow 95-100%.
    expect(commonCount / N).toBeGreaterThan(0.95);
  });

  it("returns the only option when there is one", () => {
    const rng = createSeededRng(42);
    const result = getWeightedOption([["only", 100]], rng);
    expect(result).toBe("only");
  });

  it("never returns an option with 0 weight", () => {
    const rng = createSeededRng(42);
    const options: [string, number][] = [["zero", 0], ["nonzero", 100]];

    for (let i = 0; i < 1000; i++) {
      expect(getWeightedOption(options, rng)).toBe("nonzero");
    }
  });

  it("works with numeric option values (used for syllable counts, etc.)", () => {
    const rng = createSeededRng(42);
    const options: [number, number][] = [[1, 30], [2, 50], [3, 20]];

    const results = Array.from({ length: 100 }, () => getWeightedOption(options, rng));

    // All results should be valid options
    for (const r of results) {
      expect([1, 2, 3]).toContain(r);
    }

    // Should have some variety
    const unique = new Set(results);
    expect(unique.size).toBe(3);
  });

  it("works with boolean option values (used for probability decisions)", () => {
    const rng = createSeededRng(42);
    const options: [boolean, number][] = [[true, 70], [false, 30]];

    let trueCount = 0;
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      if (getWeightedOption(options, rng)) trueCount++;
    }

    // 70% weight → expect ~70%. Allow 65-75%.
    expect(trueCount / N).toBeGreaterThan(0.65);
    expect(trueCount / N).toBeLessThan(0.75);
  });
});

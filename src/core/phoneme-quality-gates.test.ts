import { describe, expect, it } from "vitest";
import { phonemeGateViolations, type PhonemeGateLimits } from "./phoneme-quality-gates.js";
import type { PhonemeComparisonRow } from "./phoneme-quality.js";

function row(phoneme: string, generatedPct: number, baselinePct: number): PhonemeComparisonRow {
  const gapPct = generatedPct - baselinePct;
  return { phoneme, generatedPct, baselinePct, ratio: generatedPct / baselinePct, gapPct, absGapPct: Math.abs(gapPct) };
}

const limits: PhonemeGateLimits = {
  maxOverRepresentation: 1.066,
  minRepresentation: 0.918,
  maxAbsoluteGapPct: 0.39,
  phonemeOverrides: {
    z: { maxOverRepresentation: 1.1 },
    n: { maxAbsoluteGapPct: 0.45 },
  },
};

describe("per-phoneme quality gates", () => {
  it("does not let a permitted worst raw ratio hide another phone's failure", () => {
    const rows = [row("z", 2.85, 2.6), row("k", 5.35, 5)];
    const violations = phonemeGateViolations(rows, limits);
    expect(violations).toEqual([
      { phoneme: "k", metric: "overRepresentation", value: 5.35 / 5, limit: 1.066 },
    ]);
    expect(phonemeGateViolations([...rows].reverse(), limits)).toEqual(violations);
  });

  it("keeps every other phone's absolute-gap bound when n has an exception", () => {
    const violations = phonemeGateViolations([row("n", 6.65, 7.07), row("r", 6.65, 7.07)], limits);
    expect(violations).toEqual([
      { phoneme: "r", metric: "absoluteGapPct", value: Math.abs(6.65 - 7.07), limit: 0.39 },
    ]);
  });

  it("retains z's gap limit and n's ratio limits", () => {
    expect(phonemeGateViolations([row("z", 9.5, 10), row("n", 1.08, 1)], limits)).toEqual([
      { phoneme: "z", metric: "absoluteGapPct", value: 0.5, limit: 0.39 },
      { phoneme: "n", metric: "overRepresentation", value: 1.08, limit: 1.066 },
    ]);
    expect(phonemeGateViolations([row("n", 0.9, 1)], limits)).toEqual([
      { phoneme: "n", metric: "underRepresentation", value: 0.9, limit: 0.918 },
    ]);
  });

  it("still fails a reviewed phone when it exceeds its own limit", () => {
    expect(phonemeGateViolations([row("z", 1.11, 1)], limits)).toEqual([
      { phoneme: "z", metric: "overRepresentation", value: 1.11, limit: 1.1 },
    ]);
  });

  it("uses global bounds when no overrides are configured, with inclusive boundaries", () => {
    const defaults = { maxOverRepresentation: 1.1, minRepresentation: 0.9, maxAbsoluteGapPct: 0.5 };
    expect(phonemeGateViolations([row("z", 1.1, 1), row("n", 0.9, 1), row("r", 9.5, 10)], defaults)).toEqual([]);
  });
});

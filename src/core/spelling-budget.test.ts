import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import type { WrittenFormConstraints } from "../config/language.js";
import { measureSpellingBudgets } from "./spelling-budget.js";
import { measureSpellingBudgets as reference } from "../../evaluation/quality/probes/linear-spelling-budget/reference.js";
import { measurementCases } from "../../evaluation/quality/probes/linear-spelling-budget/cases.js";

const allLimits = { maxConsonantGraphemes: 1, maxConsonantLetters: 1, maxFinalConsonantLetters: 1, maxVowelLetters: 1 };

describe("spelling budget scan equivalence", () => {
  it("matches the frozen original over 248,042 preregistered cases", () => {
    let count = 0;
    for (const { label, surface, constraints } of measurementCases()) {
      assert.deepStrictEqual(measureSpellingBudgets(surface, constraints), reference(surface, constraints), `${label}: ${JSON.stringify(surface)}`);
      count++;
    }
    expect(count).toBe(248042);
  });

  it.each([
    { surface: "", values: [0, 0, 0, 0] },
    { surface: "strengths", values: [3, 5, 5, 1] },
    { surface: "twelfths", values: [4, 5, 5, 1] },
    { surface: "y", values: [1, 1, 1, 0] },
    { surface: "Y", values: [1, 1, 1, 0] },
    { surface: "ya", values: [1, 1, 0, 1] },
    { surface: "yb", values: [1, 1, 1, 1] },
    { surface: "ayb", values: [1, 1, 1, 2] },
    { surface: "yay", values: [1, 1, 1, 1] },
    { surface: "aye", values: [1, 1, 0, 1] },
    { surface: "bth", tokens: ["th", "t"], values: [2, 3, 3, 0] },
    { surface: "bth", tokens: ["t", "th"], values: [3, 3, 3, 0] },
    { surface: "YATH", values: [2, 2, 2, 1] },
    { surface: "YATH", tokens: ["Th", "TH", "th"], values: [1, 2, 2, 1] },
    { surface: "yab", tokens: ["ya"], values: [1, 1, 1, 1] },
    { surface: "abthy", tokens: ["ab"], values: [3, 4, 4, 1] },
    { surface: "\uD83D\uDE00y", values: [3, 3, 3, 0] },
    { surface: "\uD83D\uDE00y", tokens: ["\uD83D\uDE00", "\uD83D"], values: [2, 3, 3, 0] },
    { surface: "\uD83D\uDE00ya", tokens: ["\uD83D\uDE00", "\uD83D"], values: [2, 3, 0, 1] },
    { surface: "a!Y", values: [2, 2, 2, 1] },
  ])("preserves raw and token context for $surface with $tokens", ({ surface, tokens, values }) => {
    const actual = measureSpellingBudgets(surface, { consonantGraphemes: tokens }).values;
    expect(actual).toEqual({ consonantGraphemes: values[0], consonantLetters: values[1], finalConsonantLetters: values[2], vowelLetters: values[3] });
  });

  it("reads reordered, replaced, empty and omitted custom lists between calls", () => {
    const tokens = ["th", "t"];
    const constraints: WrittenFormConstraints = { consonantGraphemes: tokens };
    const check = (expected: number) => {
      expect(measureSpellingBudgets("bth", constraints)).toEqual(reference("bth", constraints));
      expect(measureSpellingBudgets("bth", constraints).values.consonantGraphemes).toBe(expected);
    };
    check(2);
    tokens.reverse();
    check(3);
    constraints.consonantGraphemes = ["bth"];
    check(1);
    tokens.splice(0, tokens.length, "b", "t", "h");
    check(1);
    constraints.consonantGraphemes = [];
    check(3);
    constraints.consonantGraphemes = undefined;
    check(2);
  });

  it("keeps limit truthiness and the configured key order", () => {
    const result = measureSpellingBudgets("aabbb", { maxVowelLetters: 1, maxFinalConsonantLetters: 1, maxConsonantLetters: 1, maxConsonantGraphemes: 1 });
    const keys = ["consonantGraphemes", "consonantLetters", "finalConsonantLetters", "vowelLetters"];
    expect(Object.keys(result.limits)).toEqual(keys);
    expect(result.exceeded).toEqual(keys);
    expect(measureSpellingBudgets("y", { maxConsonantGraphemes: 0, maxConsonantLetters: Number.NaN, maxFinalConsonantLetters: Number.POSITIVE_INFINITY, maxVowelLetters: -1 })).toEqual({
      values: { consonantGraphemes: 1, consonantLetters: 1, finalConsonantLetters: 1, vowelLetters: 0 },
      limits: { finalConsonantLetters: Number.POSITIVE_INFINITY, vowelLetters: -1 }, exceeded: ["vowelLetters"],
    });
  });

  it("retains constraint getter access order", () => {
    const accesses: string[] = [];
    const constraints: WrittenFormConstraints = {
      get consonantGraphemes() { accesses.push("tokens"); return ["th"]; },
      get maxConsonantGraphemes() { accesses.push("graphemes"); return 1; },
      get maxConsonantLetters() { accesses.push("letters"); return 1; },
      get maxFinalConsonantLetters() { accesses.push("final"); return 1; },
      get maxVowelLetters() { accesses.push("vowels"); return 1; },
    };
    measureSpellingBudgets("bth", constraints);
    expect(accesses).toEqual(["tokens", "graphemes", "letters", "final", "vowels"]);
  });

  it("returns fresh measurements without sharing mutable result fields", () => {
    const first = measureSpellingBudgets("aabbb", allLimits);
    const second = measureSpellingBudgets("aabbb", allLimits);
    expect(first).not.toBe(second);
    expect(first.values).not.toBe(second.values);
    expect(first.limits).not.toBe(second.limits);
    expect(first.exceeded).not.toBe(second.exceeded);
    first.values.consonantLetters = 100;
    first.limits.consonantLetters = 100;
    first.exceeded.length = 0;
    expect(second).toEqual(reference("aabbb", allLimits));
    expect(measureSpellingBudgets("aabbb", allLimits)).toEqual(second);
  });
});

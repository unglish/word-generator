import { describe, expect, it } from "vitest";
import { createSeededRng, generateWord } from "../index.js";
import type { GraphemeTrace, Word } from "../types.js";
import { findExample } from "../test-support/find-example.js";

type Boundary = "same-rime" | "cross-syllable" | "other";

function boundaryOf(vowel: GraphemeTrace, next: GraphemeTrace): Boundary {
  if (vowel.syllableIndex !== next.syllableIndex) return "cross-syllable";
  return vowel.position === "nucleus" && next.position === "coda" ? "same-rime" : "other";
}

/** Every /ɛ/ grapheme choice directly followed by /t/, with its boundary. */
function etPairs(word: Word): { vowel: GraphemeTrace; boundary: Boundary }[] {
  const choices = word.trace!.graphemeSelections;
  return choices.flatMap((choice, i) => choice.phoneme === "ɛ" && choices[i + 1]?.phoneme === "t"
    ? [{ vowel: choice, boundary: boundaryOf(choice, choices[i + 1]) }]
    : []);
}

describe("ordinary e before /t/", () => {
  it.each([
    { boundary: "cross-syllable", selected: "e" },
    { boundary: "same-rime", selected: "e" },
    { boundary: "same-rime", selected: "ea" },
    { boundary: "cross-syllable", selected: "ea" },
  ])("retains both spelling families: $boundary, $selected", ({ boundary, selected }) => {
    const match = (w: Word) => etPairs(w).find(p => p.boundary === boundary && p.vowel.selected === selected);
    const { word, options } = findExample(w => match(w) !== undefined, {
      property: `/ɛ/ written ${selected} before /t/ (${boundary})`, limit: 5000, options: { morphology: false },
    });
    expect(generateWord(options)).toEqual(word);
    const { vowel } = match(word)!;
    expect(vowel.afterCondition).toContain("e");
    expect(vowel.afterPosition).toContain("e");
    expect(vowel.selection?.fallback).toBeUndefined();
    expect(vowel.weights.find(([form]) => form === selected)?.[1]).toBeGreaterThan(0);
  });

  it("keeps e available in every /ɛ/+/t/ choice without eliminating ea", () => {
    const rand = createSeededRng(42);
    const pairs = Array.from({ length: 10000 }, () => generateWord({ rand, morphology: false, trace: true }))
      .flatMap(etPairs);
    expect(pairs.length).toBeGreaterThan(150);
    for (const { vowel } of pairs) {
      expect(vowel.afterCondition).toContain("e");
      expect(vowel.afterPosition).toContain("e");
      expect(vowel.selection?.fallback).toBeUndefined();
    }
    // Unchanged weights give e at least 100/(100+140) probability wherever both
    // spellings survive. Initial-position exclusions and stress only increase it.
    const selected = (form: string, boundary?: Boundary) =>
      pairs.filter(p => p.vowel.selected === form && (boundary === undefined || p.boundary === boundary)).length;
    expect(selected("e") / pairs.length).toBeGreaterThan(0.35);
    expect(selected("ea")).toBeGreaterThan(5);
    for (const boundary of ["same-rime", "cross-syllable"] as const) {
      expect(selected("e", boundary)).toBeGreaterThan(20);
      expect(selected("ea", boundary)).toBeGreaterThan(0);
    }
  });
});

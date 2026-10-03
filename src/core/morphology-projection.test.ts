import assert from "node:assert/strict";
import { it as test } from "vitest";
import type { Phoneme, Syllable } from "../types.js";
import type { AffixForm } from "./morphology/realization.js";
import type { AffixSyllable } from "../config/language.js";
import type { MorphophonemicTarget } from "./morphology-projection.js";
import { projectMorphologyReplacement } from "./morphology-projection.js";
const phone = (sound: string): Phoneme => ({
  sound,
  voiced: true,
  mannerOfArticulation: "stop",
  placeOfArticulation: "alveolar",
  startWord: 1,
  midWord: 1,
  endWord: 1,
});
const root = (): Syllable[] => [
  {
    onset: [phone("r")],
    nucleus: [phone("a")],
    coda: [phone("s"), phone("k")],
    stress: "ˈ",
  },
];
const target: MorphophonemicTarget = {
  syllableIndex: 0,
  segment: "coda",
  index: 1,
};
const affix = (
  phonemes: string[],
  syllableCount = 0,
  syllables?: AffixSyllable[],
): AffixForm => ({
  written: "x",
  phonemes,
  syllableCount,
  ...(syllables ? { syllables } : {}),
});
test("proposal substitutes one lexical identity without mutating root or forms", () => {
  const original = root(),
    before = structuredClone(original);
  const p = projectMorphologyReplacement(
    original,
    target,
    phone("s"),
    undefined,
    undefined,
    phone,
  );
  assert.deepEqual(original, before);
  assert.equal(p.selected.source.part, "root");
  assert.deepEqual(
    p.syllables[0].coda.map((p) => p.phoneme.sound),
    ["s", "s"],
  );
  assert.equal(p.selected.source.index, 1);
  assert.deepEqual(p.rootTarget, target);
});
test("flat prefix/root repetition has distinct owners and exact existing insertion order", () => {
  const p = projectMorphologyReplacement(
    root(),
    { syllableIndex: 0, segment: "onset", index: 0 },
    phone("r"),
    affix(["r", "i"]),
    undefined,
    phone,
  );
  assert.deepEqual(
    p.syllables[0].onset.map((p) => p.phoneme.sound),
    ["i", "r", "r"],
  );
  assert.deepEqual(
    p.syllables[0].onset.map((p) => p.source.part),
    ["prefix", "prefix", "root"],
  );
  assert.equal(p.target.index, 2);
  assert.equal(p.selected.source.index, 0);
});
test("flat suffix preserves lexical coordinates and morphological ownership", () => {
  const p = projectMorphologyReplacement(
    root(),
    target,
    phone("s"),
    undefined,
    affix(["s", "t"]),
    phone,
  );
  assert.deepEqual(
    p.syllables[0].coda.map((p) => p.source.part),
    ["root", "root", "suffix", "suffix"],
  );
  assert.equal(p.target.index, 1);
  assert.equal(p.syllables[0].coda[2].source.index, 0);
});
test("syllabic boundaries keep source coordinates and relocate assembled target", () => {
  const template = { onset: ["p"], nucleus: ["e"], coda: [] };
  const p = projectMorphologyReplacement(
    root(),
    target,
    phone("s"),
    affix([], 1, [template]),
    affix([], 1, [template]),
    phone,
  );
  assert.equal(p.syllables.length, 3);
  assert.equal(p.rootSyllableStart, 1);
  assert.equal(p.target.syllableIndex, 1);
  assert.equal(p.syllables[2].nucleus[0].source.part, "suffix");
  const source = p.syllables[2].nucleus[0].source;
  assert.equal(source.kind, "segment");
  assert(source.kind === "segment");
  assert.equal(source.syllable, 0);
});
test("zero-syllable structured affixes preserve whole-template prepend order", () => {
  const templates = [
    { onset: ["p"], nucleus: ["e"], coda: ["s"] },
    { onset: ["t"], nucleus: ["i"], coda: [] },
  ];
  const p = projectMorphologyReplacement(
    root(),
    target,
    phone("s"),
    affix([], 0, templates),
    affix([], 0, templates),
    phone,
  );
  assert.deepEqual(
    p.syllables[0].onset.map((p) => p.phoneme.sound),
    ["t", "i", "p", "e", "s", "r"],
  );
  assert.deepEqual(
    p.syllables[0].coda.map((p) => p.phoneme.sound),
    ["s", "s", "p", "e", "s", "t", "i"],
  );
  assert.equal(p.syllables.length, 1);
  assert.equal(p.selected.source.part, "root");
});
test("invalid lexical target fails before returning any proposal", () => {
  assert.throws(
    () =>
      projectMorphologyReplacement(
        root(),
        { ...target, index: 4 },
        phone("s"),
        undefined,
        undefined,
        phone,
      ),
    /outside/,
  );
});

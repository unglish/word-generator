import { describe, expect, it } from "vitest";
import type { Phoneme } from "../types.js";
import type { SpellingPhone } from "./base-spelling.js";
import { spellingBoundaryContexts } from "./spelling-context.js";

const vowel: Phoneme = {
  sound: "æ",
  mannerOfArticulation: "lowVowel",
  placeOfArticulation: "front",
  voiced: true,
  reduced: true,
};
const stop: Phoneme = {
  sound: "t",
  mannerOfArticulation: "stop",
  placeOfArticulation: "alveolar",
  voiced: false,
};
const phones: SpellingPhone[] = [
  {
    id: 0,
    part: "root",
    syllableIndex: 0,
    segment: "nucleus",
    segmentIndex: 0,
    soundAtSpelling: "æ",
    boundary: { phoneme: vowel, stress: "ˈ" },
  },
  {
    id: 1,
    part: "root",
    syllableIndex: 0,
    segment: "coda",
    segmentIndex: 0,
    soundAtSpelling: "t",
    boundary: { phoneme: stop, stress: "ˈ", nextWritten: "ing" },
  },
];

describe("detached spelling boundary contract", () => {
  it("preserves exact serialized context fields and ordering", () => {
    const expected = [
      {
        slot: {
          phoneme: vowel,
          nextPhoneme: stop,
          index: 0,
          total: 2,
          position: "nucleus",
          syllableIndex: 0,
          syllableCount: 1,
          onsetLength: 0,
          nucleusLength: 1,
          codaLength: 1,
          isCluster: false,
          stress: "ˈ",
        },
        doubling: {
          phoneme: vowel,
          position: "nucleus",
          stress: "ˈ",
          prevReduced: false,
          isCluster: false,
          isFirstInCoda: false,
          isLastPhoneme: false,
          isEndOfWord: true,
          isMonosyllabic: true,
          nextIsConsonant: true,
        },
      },
      {
        slot: {
          phoneme: stop,
          prevPhoneme: vowel,
          index: 1,
          total: 2,
          position: "coda",
          syllableIndex: 0,
          syllableCount: 1,
          onsetLength: 0,
          nucleusLength: 1,
          codaLength: 1,
          isCluster: false,
          stress: "ˈ",
          previousPosition: "nucleus",
          nextWritten: "ing",
        },
        doubling: {
          phoneme: stop,
          position: "coda",
          prevPhoneme: vowel,
          stress: "ˈ",
          prevReduced: true,
          isCluster: false,
          isFirstInCoda: true,
          isLastPhoneme: true,
          isEndOfWord: true,
          isMonosyllabic: true,
          nextIsConsonant: false,
        },
      },
    ];
    expect(JSON.stringify(spellingBoundaryContexts(phones))).toBe(
      JSON.stringify(expected),
    );
  });
  it("refuses missing or inconsistent detached evidence", () => {
    for (const altered of [
      { ...phones[0], boundary: undefined },
      { ...phones[0], id: 2 },
      { ...phones[0], soundAtSpelling: "i" },
      { ...phones[0], segmentIndex: 1 },
    ])
      expect(() => spellingBoundaryContexts([altered])).toThrow(
        "Invalid spelling evidence: writer boundary",
      );
  });
});

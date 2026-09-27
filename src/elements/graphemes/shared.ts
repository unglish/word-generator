import type { SharedSpellingRule } from "../../config/language.js";

/** Shared readings are separate from the single-phone selection inventory. */
export const englishSharedSpellings: SharedSpellingRule[] = [
  { id: "ks-to-x", phonemes: [{ sound: "k" }, { sound: "s" }], form: "x", probability: 25,
    scope: "both", context: { nonInitial: true } },
  { id: "gz-to-x", phonemes: [{ sound: "g" }, { sound: "z" }], form: "x", probability: 85,
    scope: "word", context: { nonInitial: true,
      following: { phoneClass: "vowel", letters: ["a", "e", "i", "o", "u", "y"] } } },
  { id: "cw-to-qu", phonemes: [{ sound: "k" }, { sound: "w" }], form: "qu", probability: 100,
    scope: "word", context: {} },
];

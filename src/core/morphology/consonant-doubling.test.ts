/**
 * Consonant doubling before vowel suffixes follows the root's final syllable:
 * it doubles only when that syllable is stressed and its vowel reads short
 * from one letter (`commit` → `committed`; `visit` → `visited`).
 */
import { describe, expect, it } from "vitest";
import { englishConfig } from "../../config/english.js";
import type { BoundaryTransform } from "../../config/language.js";
import { phonemes } from "../../elements/phonemes.js";
import { generateWord } from "../../index.js";
import { findExample } from "../../test-support/find-example.js";
import type { Syllable, Word } from "../../types.js";
import { applyBoundaryTransforms, matchesBoundarySyllable, syllableStressLevel } from "./attach.js";

const phonemeBySound = new Map(phonemes.map((p) => [p.sound, p]));

function syllable(onset: string[], nucleus: string, coda: string[], stress?: "ˈ" | "ˌ"): Syllable {
  const get = (sound: string) => phonemeBySound.get(sound)!;
  return { onset: onset.map(get), nucleus: [get(nucleus)], coda: coda.map(get), stress };
}

function suffixTransforms(written: string): BoundaryTransform[] {
  return englishConfig.morphology!.suffixes.find((s) => s.written === written)!.boundaryTransforms!;
}

const ED = suffixTransforms("ed");
const DOUBLE = ED.find((t) => t.name === "double-consonant")!;

describe("double-consonant boundary condition", () => {
  it.each([
    { root: "stop", final: syllable(["s", "t"], "ɑ", ["p"], "ˈ"), expected: "stopp", why: "stressed lot vowel" },
    { root: "commit", final: syllable(["m"], "ɪ", ["t"], "ˈ"), expected: "committ", why: "primary-stressed checked vowel" },
    { root: "kidnap", final: syllable(["n"], "æ", ["p"], "ˌ"), expected: "kidnapp", why: "secondary-stressed checked vowel" },
    { root: "visit", final: syllable(["z"], "ɪ", ["t"]), expected: "visit", why: "unstressed final syllable" },
    { root: "gallop", final: syllable(["l"], "ə", ["p"], "ˌ"), expected: "gallop", why: "schwa, even under secondary stress" },
    { root: "bat", final: syllable(["b"], "eɪ", ["t"], "ˈ"), expected: "bat", why: "stressed long vowel /beɪt/" },
    { root: "mit", final: syllable(["m"], "aɪ", ["t"], "ˈ"), expected: "mit", why: "stressed diphthong /maɪt/" },
    { root: "occur", final: syllable(["k"], "ɚ", [], "ˈ"), expected: "occurr", why: "stressed r-coloured vowel" },
    { root: "letter", final: syllable(["t"], "ɚ", []), expected: "letter", why: "unstressed r-coloured vowel" },
    { root: "star", final: syllable(["s", "t"], "ɑ", ["r"], "ˈ"), expected: "starr", why: "stressed /ɑr/" },
    { root: "wuber", final: syllable(["b"], "ɚ", [], "ˌ"), expected: "wuber", why: "secondary-stressed r-coloured vowel" },
  ])("$root + ed → $expected ($why)", ({ root, final, expected }) => {
    expect(applyBoundaryTransforms(root, ED, final)).toBe(expected);
  });

  it("never doubles without a boundary syllable to check", () => {
    expect(applyBoundaryTransforms("stop", [DOUBLE])).toBe("stop");
  });

  it("keeps drop-silent-e blocking doubling", () => {
    expect(applyBoundaryTransforms("dine", ED, syllable(["d"], "aɪ", ["n"], "ˈ"))).toBe("din");
  });

  it("reads stress levels from the syllable", () => {
    expect(syllableStressLevel(syllable([], "ɪ", [], "ˈ"))).toBe("primary");
    expect(syllableStressLevel(syllable([], "ɪ", [], "ˌ"))).toBe("secondary");
    expect(syllableStressLevel(syllable([], "ɪ", []))).toBe("unstressed");
    expect(matchesBoundarySyllable({ stress: ["primary"] }, undefined)).toBe(false);
  });
});

const DOUBLING_SUFFIXES = new Set(["ing", "ed", "er", "est", "able"]);
const DOUBLING_SHAPE = /[^aeiou][aeiou][bcdfghlmnprst]$/i;
/** Stated independently of the config: full short vowels, plus /ɚ/ under primary stress. */
const FULL_SHORT = new Set(["ɪ", "ɛ", "æ", "ʌ", "ʊ", "ɑ", "ɔ", "ɜ"]);

interface DoublingCase {
  word: Word;
  base: string;
  doubled: boolean;
  final: Syllable;
}

/** A suffixed word whose base root has the letter shape the transform doubles. */
function doublingCase(word: Word): DoublingCase | undefined {
  const morphology = word.trace?.morphology;
  if (!morphology?.suffix || !DOUBLING_SUFFIXES.has(morphology.suffix)) return undefined;
  const base = word.trace?.baseSpelling?.surface ?? "";
  if (!DOUBLING_SHAPE.test(base)) return undefined;
  const root = morphology.realization?.assembledParts.find((part) => part.role === "root")?.text;
  const lexicalRoot = word.lexical!.root;
  return { word, base, doubled: root === base + base.slice(-1), final: lexicalRoot[lexicalRoot.length - 1] };
}

function isStressedShort(final: Syllable): boolean {
  const sounds = final.nucleus.map((p) => p.sound);
  if (final.stress === "ˈ") return sounds.every((sound) => FULL_SHORT.has(sound) || sound === "ɚ");
  if (final.stress === "ˌ") return sounds.every((sound) => FULL_SHORT.has(sound));
  return false;
}

describe("consonant doubling over a seed sample", () => {
  it("doubles when a root-final full short vowel retains secondary stress", () => {
    const word = generateWord({ seed: 5_000_028, trace: true });
    const example = doublingCase(word)!;
    const rootEnd = word.lexical!.rootSyllableStart + word.lexical!.root.length - 1;
    expect(example.final.stress).toBe("ˌ");
    expect(example.doubled).toBe(true);
    expect(word.syllables[rootEnd]).toMatchObject({
      stress: "ˌ",
      nucleus: [{ sound: example.final.nucleus[0].sound }],
    });
    expect(word.syllables[rootEnd].nucleus[0].reduced).toBeUndefined();
  });

  it("finds a stressed short-vowel root that doubles", () => {
    const { word } = findExample((w) => {
      const c = doublingCase(w);
      return !!c && isStressedShort(c.final);
    }, { property: "a stressed short-vowel CVC root before a vowel suffix", limit: 2_000, firstSeed: 5_000_000 });
    expect(doublingCase(word)!.doubled).toBe(true);
  });

  it("doubles exactly the stressed short-vowel roots", () => {
    const tally = { stressedShort: 0, stressedShortDoubled: 0, other: 0, otherDoubled: 0 };
    for (let seed = 5_000_000; seed < 5_004_000; seed++) {
      const c = doublingCase(generateWord({ seed, trace: true }));
      if (!c) continue;
      if (isStressedShort(c.final)) {
        tally.stressedShort++;
        if (c.doubled) tally.stressedShortDoubled++;
      } else {
        tally.other++;
        if (c.doubled) tally.otherDoubled++;
      }
    }
    // Before the stress/vowel condition, every shape-eligible root doubled.
    expect(tally.stressedShort).toBeGreaterThan(50);
    expect(tally.other).toBeGreaterThan(50);
    expect(tally.stressedShortDoubled).toBe(tally.stressedShort);
    expect(tally.otherDoubled).toBe(0);
  });
});

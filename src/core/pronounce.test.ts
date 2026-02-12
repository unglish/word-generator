import { describe, it, expect } from "vitest";
import { _reduceUnstressedVowels } from "./pronounce.js";
import { Phoneme, Syllable, WordGenerationContext } from "../types.js";
import { VowelReductionConfig } from "../config/language.js";
import { createSeededRng } from "../utils/random.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal lax vowel phoneme. */
const vowel = (sound: string, opts?: Partial<Phoneme>): Phoneme => ({
  sound,
  voiced: true,
  mannerOfArticulation: "midVowel",
  placeOfArticulation: "central",
  startWord: 1,
  midWord: 1,
  endWord: 1,
  ...opts,
});

/** Build a syllable with a single nucleus vowel. */
const syl = (v: Phoneme, stress?: "ˈ" | "ˌ"): Syllable => ({
  onset: [],
  nucleus: [v],
  coda: [],
  stress,
});

/** Build a minimal WordGenerationContext around the given syllables. */
const ctx = (syllables: Syllable[], seed = 42): WordGenerationContext => ({
  rand: createSeededRng(seed),
  word: { syllables, pronunciation: "", written: { clean: "", hyphenated: "" } },
  syllableCount: syllables.length,
  currSyllableIndex: 0,
});

/** English-like vowel reduction config. */
const englishReduction: VowelReductionConfig = {
  enabled: true,
  rules: [
    { source: "ʌ", target: "ə", probability: 85 },
    { source: "ɛ", target: "ɪ", probability: 70 },
    { source: "e", target: "ɪ", probability: 70 },
    { source: "ɑ", target: "ə", probability: 65 },
    { source: "ɔ", target: "ə", probability: 60 },
    { source: "æ", target: "ə", probability: 40 },
    { source: "o", target: "ə", probability: 55 },
    { source: "ɜ", target: "ə", probability: 75 },
  ],
  reduceSecondaryStress: true,
  secondaryStressProbability: 30,
  positionalModifiers: {
    wordInitial: 0.7,
    wordMedial: 1.0,
    wordFinal: 0.5,
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("reduceUnstressedVowels", () => {
  it("does not reduce monosyllabic words", () => {
    const v = vowel("ʌ");
    const c = ctx([syl(v)]);
    _reduceUnstressedVowels(c, englishReduction, c.rand);
    expect(c.word.syllables[0].nucleus[0].sound).toBe("ʌ");
  });

  it("does not reduce primary-stressed syllables", () => {
    const v = vowel("ʌ");
    const c = ctx([syl(v, "ˈ"), syl(vowel("ʌ"))]);
    _reduceUnstressedVowels(c, englishReduction, c.rand);
    // Primary-stressed syllable must keep its vowel
    expect(c.word.syllables[0].nucleus[0].sound).toBe("ʌ");
  });

  it("tense vowels are immune to reduction", () => {
    const tenseVowel = vowel("ʌ", { tense: true });
    // Run many seeds — none should reduce a tense vowel
    for (let seed = 0; seed < 50; seed++) {
      const c = ctx([syl(vowel("ɑ"), "ˈ"), syl(tenseVowel)], seed);
      _reduceUnstressedVowels(c, englishReduction, c.rand);
      expect(c.word.syllables[1].nucleus[0].sound).toBe("ʌ");
      expect(c.word.syllables[1].nucleus[0].reduced).toBeUndefined();
    }
  });

  it("diphthongs (no matching rule) are immune to reduction", () => {
    const diphthong = vowel("aɪ"); // no rule for this
    for (let seed = 0; seed < 50; seed++) {
      const c = ctx([syl(vowel("ɑ"), "ˈ"), syl(diphthong)], seed);
      _reduceUnstressedVowels(c, englishReduction, c.rand);
      expect(c.word.syllables[1].nucleus[0].sound).toBe("aɪ");
    }
  });

  it("sets the `reduced` flag on reduced phonemes", () => {
    // Use 100% probability to guarantee reduction
    const config: VowelReductionConfig = {
      enabled: true,
      rules: [{ source: "ʌ", target: "ə", probability: 100 }],
      reduceSecondaryStress: false,
    };
    const c = ctx([syl(vowel("ɑ"), "ˈ"), syl(vowel("ʌ"))]);
    _reduceUnstressedVowels(c, config, c.rand);
    const reduced = c.word.syllables[1].nucleus[0];
    expect(reduced.sound).toBe("ə");
    expect(reduced.reduced).toBe(true);
  });

  it("secondary stress reduces at a lower rate than fully unstressed", () => {
    // Statistical test: run many iterations, compare rates
    const config: VowelReductionConfig = {
      enabled: true,
      rules: [{ source: "ʌ", target: "ə", probability: 100 }],
      reduceSecondaryStress: true,
      secondaryStressProbability: 30,
    };

    let unstressedReductions = 0;
    let secondaryReductions = 0;
    const N = 200;

    for (let seed = 0; seed < N; seed++) {
      // Unstressed
      const c1 = ctx([syl(vowel("ɑ"), "ˈ"), syl(vowel("ʌ"))], seed);
      _reduceUnstressedVowels(c1, config, c1.rand);
      if (c1.word.syllables[1].nucleus[0].reduced) unstressedReductions++;

      // Secondary stressed
      const c2 = ctx([syl(vowel("ɑ"), "ˈ"), syl(vowel("ʌ"), "ˌ")], seed + 10000);
      _reduceUnstressedVowels(c2, config, c2.rand);
      if (c2.word.syllables[1].nucleus[0].reduced) secondaryReductions++;
    }

    // Secondary stress should reduce less than unstressed
    expect(secondaryReductions).toBeLessThan(unstressedReductions);
  });

  it("word-final position reduces less than word-medial", () => {
    const config: VowelReductionConfig = {
      enabled: true,
      rules: [{ source: "ʌ", target: "ə", probability: 80 }],
      reduceSecondaryStress: false,
      positionalModifiers: { wordInitial: 1.0, wordMedial: 1.0, wordFinal: 0.3 },
    };

    let medialReductions = 0;
    let finalReductions = 0;
    const N = 300;

    for (let seed = 0; seed < N; seed++) {
      // 3-syllable word: stressed | medial | final
      const c = ctx(
        [syl(vowel("ɑ"), "ˈ"), syl(vowel("ʌ")), syl(vowel("ʌ"))],
        seed,
      );
      _reduceUnstressedVowels(c, config, c.rand);
      if (c.word.syllables[1].nucleus[0].reduced) medialReductions++;
      if (c.word.syllables[2].nucleus[0].reduced) finalReductions++;
    }

    expect(finalReductions).toBeLessThan(medialReductions);
  });

  describe("each English VowelReductionRule fires", () => {
    // Guarantee firing with 100% probability override
    for (const rule of englishReduction.rules) {
      it(`reduces ${rule.source} → ${rule.target}`, () => {
        const config: VowelReductionConfig = {
          enabled: true,
          rules: [{ source: rule.source, target: rule.target, probability: 100 }],
          reduceSecondaryStress: false,
        };
        const c = ctx([syl(vowel("ɑ"), "ˈ"), syl(vowel(rule.source))]);
        _reduceUnstressedVowels(c, config, c.rand);
        expect(c.word.syllables[1].nucleus[0].sound).toBe(rule.target);
        expect(c.word.syllables[1].nucleus[0].reduced).toBe(true);
      });
    }
  });

  it("skips syllables when reduceSecondaryStress is false", () => {
    const config: VowelReductionConfig = {
      enabled: true,
      rules: [{ source: "ʌ", target: "ə", probability: 100 }],
      reduceSecondaryStress: false,
    };
    const c = ctx([syl(vowel("ɑ"), "ˈ"), syl(vowel("ʌ"), "ˌ")]);
    _reduceUnstressedVowels(c, config, c.rand);
    expect(c.word.syllables[1].nucleus[0].sound).toBe("ʌ");
  });
});

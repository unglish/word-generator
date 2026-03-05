import { describe, it, expect } from "vitest";
import { _applyAspiration, _reduceUnstressedVowels } from "./pronounce.js";
import { generateWord } from "./generate.js";
import { Phoneme, Syllable, WordGenerationContext } from "../types.js";
import { resolveAspirationRules, VowelReductionConfig } from "../config/language.js";
import { createSeededRng } from "../utils/random.js";
import { TraceCollector } from "./trace.js";

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

/** Minimal consonant phoneme. */
const consonant = (
  sound: string,
  opts?: Partial<Phoneme>,
): Phoneme => ({
  sound,
  voiced: false,
  mannerOfArticulation: "stop",
  placeOfArticulation: "alveolar",
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
    { source: "ɑ", target: "ə", probability: 65 },
    { source: "ɔ", target: "ə", probability: 60 },
    { source: "æ", target: "ə", probability: 40 },
    { source: "ɜ", target: "ə", probability: 75 },
    { source: "ɪ", target: "ə", probability: 45 },
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
    // Use a naturally tense vowel — /i:/ not /ʌ/ (which is canonically lax)
    const tenseVowel = vowel("i:", { tense: true });
    // Run many seeds — none should reduce a tense vowel
    for (let seed = 0; seed < 50; seed++) {
      const c = ctx([syl(vowel("ɑ"), "ˈ"), syl(tenseVowel)], seed);
      _reduceUnstressedVowels(c, englishReduction, c.rand);
      expect(c.word.syllables[1].nucleus[0].sound).toBe("i:");
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

describe("applyAspiration", () => {
  const aggressiveAspiration = resolveAspirationRules({
    enabled: true,
    targets: [{ segment: "onset", index: 0, manner: ["stop"], voiced: false }],
    rules: [
      { id: "post-s", when: { previousCodaSounds: ["s"] }, probability: 100 },
      { id: "word-initial", when: { wordInitial: true }, probability: 100 },
      { id: "stressed", when: { stressed: true }, probability: 100 },
      { id: "post-stressed", when: { postStressed: true }, probability: 100 },
    ],
    fallbackProbability: 100,
  });

  it("aspirates word-initial voiceless stop onsets", () => {
    const c = ctx([
      {
        onset: [consonant("p", { placeOfArticulation: "bilabial" })],
        nucleus: [vowel("ɑ")],
        coda: [],
      },
    ]);

    _applyAspiration(c, aggressiveAspiration);
    expect(c.word.syllables[0].onset[0].sound).toBe("p");
    expect(c.word.syllables[0].onset[0].aspirated).toBe(true);
  });

  it("does not aspirate voiced stop onsets", () => {
    const c = ctx([
      {
        onset: [consonant("b", { voiced: true, placeOfArticulation: "bilabial" })],
        nucleus: [vowel("ɑ")],
        coda: [],
      },
    ]);

    _applyAspiration(c, aggressiveAspiration);
    expect(c.word.syllables[0].onset[0].sound).toBe("b");
    expect(c.word.syllables[0].onset[0].aspirated).toBeUndefined();
  });

  it("does not aspirate word-final codas", () => {
    const c = ctx([
      {
        onset: [consonant("k", { placeOfArticulation: "velar" })],
        nucleus: [vowel("ɑ")],
        coda: [],
      },
      {
        onset: [],
        nucleus: [vowel("ɑ")],
        coda: [consonant("t")],
      },
    ]);

    _applyAspiration(c, aggressiveAspiration);
    expect(c.word.syllables[1].coda[0].sound).toBe("t");
    expect(c.word.syllables[1].coda[0].aspirated).toBeUndefined();
  });

  it("respects post-/s/ suppression probability", () => {
    const c = ctx([
      {
        onset: [consonant("m", { mannerOfArticulation: "nasal", voiced: true, placeOfArticulation: "bilabial" })],
        nucleus: [vowel("ɑ")],
        coda: [consonant("s", { mannerOfArticulation: "sibilant", placeOfArticulation: "alveolar" })],
      },
      {
        onset: [consonant("t")],
        nucleus: [vowel("ɑ")],
        coda: [],
      },
    ]);

    const postSBlocked = resolveAspirationRules({
      enabled: true,
      targets: [{ segment: "onset", index: 0, manner: ["stop"], voiced: false }],
      rules: [
        { id: "post-s", when: { previousCodaSounds: ["s"] }, probability: 0 },
        { id: "word-initial", when: { wordInitial: true }, probability: 100 },
        { id: "stressed", when: { stressed: true }, probability: 100 },
      ],
      fallbackProbability: 100,
    });

    _applyAspiration(c, postSBlocked);
    expect(c.word.syllables[1].onset[0].sound).toBe("t");
    expect(c.word.syllables[1].onset[0].aspirated).toBeUndefined();
  });

  it("can disable aspiration entirely", () => {
    const c = ctx([
      {
        onset: [consonant("p", { placeOfArticulation: "bilabial" })],
        nucleus: [vowel("ɑ")],
        coda: [],
      },
    ]);

    _applyAspiration(c, { ...aggressiveAspiration, enabled: false });
    expect(c.word.syllables[0].onset[0].sound).toBe("p");
    expect(c.word.syllables[0].onset[0].aspirated).toBeUndefined();
  });

  it("applies custom precedence order deterministically", () => {
    const c = ctx([
      {
        onset: [consonant("s", { mannerOfArticulation: "sibilant" })],
        nucleus: [vowel("ɑ")],
        coda: [consonant("s", { mannerOfArticulation: "sibilant" })],
      },
      {
        onset: [consonant("t", { placeOfArticulation: "alveolar" })],
        nucleus: [vowel("ɑ")],
        coda: [],
        stress: "ˈ",
      },
    ]);

    const precedenceDriven = resolveAspirationRules({
      enabled: true,
      targets: [{ segment: "onset", index: 0, manner: ["stop"], voiced: false }],
      rules: [
        { id: "stressed-priority", when: { stressed: true }, probability: 100 },
        { id: "post-s", when: { previousCodaSounds: ["s"] }, probability: 0 },
      ],
      fallbackProbability: 0,
    });

    _applyAspiration(c, precedenceDriven);
    expect(c.word.syllables[1].onset[0].aspirated).toBe(true);
  });

  it("records typed aspirationDecision trace entries", () => {
    const c = ctx([
      {
        onset: [consonant("p", { placeOfArticulation: "bilabial" })],
        nucleus: [vowel("ɑ")],
        coda: [],
      },
    ]);
    c.trace = new TraceCollector();

    _applyAspiration(c, aggressiveAspiration);

    const events = c.trace.structural.filter((e) => e.event === "aspirationDecision");
    expect(events.length).toBe(1);
    expect(events[0].event).toBe("aspirationDecision");
    if (events[0].event === "aspirationDecision") {
      expect(events[0].evaluated).toBe(true);
      expect(events[0].syllableIndex).toBe(0);
      expect(events[0].eligible).toBe(true);
      expect(events[0].targetSegment).toBe("onset");
      expect(events[0].targetIndex).toBe(0);
      expect(events[0].targetPhoneme).toBe("p");
    }
  });

  it("records target segment/index when non-onset aspiration selectors are used", () => {
    const c = ctx([
      {
        onset: [consonant("k", { placeOfArticulation: "velar" })],
        nucleus: [vowel("ɑ")],
        coda: [],
      },
    ]);
    c.trace = new TraceCollector();

    const nucleusAspiration = resolveAspirationRules({
      enabled: true,
      targets: [{ segment: "nucleus", index: 0 }],
      rules: [{ id: "always", when: { wordInitial: true }, probability: 100 }],
      fallbackProbability: 0,
    });

    _applyAspiration(c, nucleusAspiration);
    expect(c.word.syllables[0].nucleus[0].aspirated).toBe(true);

    const events = c.trace.structural.filter((e) => e.event === "aspirationDecision");
    expect(events.length).toBe(1);
    expect(events[0].event).toBe("aspirationDecision");
    if (events[0].event === "aspirationDecision") {
      expect(events[0].targetSegment).toBe("nucleus");
      expect(events[0].targetIndex).toBe(0);
      expect(events[0].targetPhoneme).toBe("ɑ");
    }
  });

  it("keeps canonical phoneme sounds free of aspiration diacritics across deterministic sweep", () => {
    for (let seed = 0; seed < 5000; seed++) {
      const word = generateWord({ seed, morphology: false, mode: "lexicon" });
      for (const syllable of word.syllables) {
        for (const phoneme of [...syllable.onset, ...syllable.nucleus, ...syllable.coda]) {
          expect(phoneme.sound.includes("ʰ")).toBe(false);
        }
      }
    }
  });

  it("encodes aspiration with `aspirated: true` while pronunciation still renders ʰ", () => {
    let foundAspiratedWord = false;
    for (let seed = 0; seed < 3000; seed++) {
      const word = generateWord({ seed, morphology: false, mode: "lexicon" });
      const aspirated = word.syllables
        .flatMap(s => [...s.onset, ...s.nucleus, ...s.coda])
        .filter(p => p.aspirated);
      if (aspirated.length === 0) continue;

      foundAspiratedWord = true;
      expect(word.pronunciation.includes("ʰ")).toBe(true);
      for (const phoneme of aspirated) {
        expect(phoneme.sound.includes("ʰ")).toBe(false);
      }
      break;
    }
    expect(foundAspiratedWord).toBe(true);
  });
});

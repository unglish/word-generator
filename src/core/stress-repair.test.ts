import { describe, it, expect } from "vitest";
import { generateWord, generateWords } from "../index.js";

describe("stress-aware nucleus re-pick", () => {
  it("keeps schwa out of stress in both the lexical and surface forms", () => {
    // The first seed puts rhythmic stress on root schwa on the base branch.
    // The second reduces secondary-stressed re- to schwa in the surface pass.
    for (const seed of [5_000_009, 5_000_022]) {
      const word = generateWord({ seed, trace: true });
      for (const syllable of [...word.lexical!.syllables, ...word.syllables]) {
        if (syllable.nucleus.some(({ sound }) => sound === "ə")) {
          expect(syllable.stress, `seed ${seed}: ${word.pronunciation}`).toBeUndefined();
        }
      }
    }
  });

  it("keeps final rhotic stress and unstressed full short vowels rare", () => {
    const words = generateWords(4_000, { seed: 476 });
    const finals = words
      .filter(({ syllables }) => syllables.length > 1)
      .map(({ syllables }) => syllables[syllables.length - 1]);
    const rhoticFinals = finals.filter(({ nucleus }) => nucleus[0]?.sound === "ɚ");
    const primary = rhoticFinals.filter(({ stress }) => stress === "ˈ").length;
    expect(rhoticFinals.length).toBeGreaterThan(300);
    expect(rhoticFinals.some(({ stress }) => stress === "ˌ")).toBe(false);
    expect(primary / rhoticFinals.length).toBeGreaterThan(0.015);
    expect(primary / rhoticFinals.length).toBeLessThan(0.07);

    const fullShort = new Set(["ɛ", "æ", "ʌ", "ɑ", "ɔ"]);
    const unstressedFull = finals.filter(({ stress, nucleus }) =>
      !stress && fullShort.has(nucleus[0]?.sound),
    );
    expect(unstressedFull.length / finals.length).toBeLessThan(0.035);
  });

  it("has no stressed schwa in 10,000 bare words", { timeout: 20_000 }, () => {
    const words = generateWords(10_000, { seed: 123, morphology: false });
    let stressedSchwaCount = 0;

    for (const word of words) {
      for (const syl of word.syllables) {
        if (syl.stress && syl.nucleus[0]?.sound === "ə") {
          stressedSchwaCount++;
        }
      }
    }

    expect(stressedSchwaCount).toBe(0);
  });

  it("standalone monosyllables retain lexical stress without an IPA stress mark", { timeout: 20_000 }, () => {
    const words = generateWords(10_000, { seed: 456, syllableCount: 1, morphology: false });
    let schwaCount = 0;

    for (const word of words) {
      expect(word.syllables[0].stress).toBe("ˈ");
      expect(word.pronunciation).not.toContain("ˈ");
      if (word.syllables[0]?.nucleus[0]?.sound === "ə") {
        schwaCount++;
      }
    }

    expect(schwaCount).toBe(0);
  });
});

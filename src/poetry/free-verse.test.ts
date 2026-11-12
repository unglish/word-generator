import { describe, expect, it } from "vitest";
import { createSeededRng } from "../utils/random.js";
import { scorePhoneticBeauty, createPhoneticBeautyRanker } from "./beauty.js";
import { buildLexicon, clampLexiconSize, elitePool } from "./lexicon.js";
import { chooseSilhouette, composeFreeVerse } from "./free-verse.js";

describe("poetry lexicon + free verse", () => {
  it("clamps lexicon size into a sane band", () => {
    expect(clampLexiconSize(undefined)).toBe(2000);
    expect(clampLexiconSize(10)).toBe(100);
    expect(clampLexiconSize(50_000)).toBe(50_000);
    expect(clampLexiconSize(999_999)).toBe(100_000);
  });

  it("builds a deduped scored lexicon", () => {
    const lexicon = buildLexicon({ size: 120, seed: 77, morphology: false, mode: "lexicon" });
    expect(lexicon.length).toBe(120);
    const written = new Set(lexicon.map((e) => e.word.written.clean.toLowerCase()));
    expect(written.size).toBe(120);
    for (let i = 1; i < lexicon.length; i++) {
      expect(lexicon[i]!.score).toBeLessThanOrEqual(lexicon[i - 1]!.score);
    }
    expect(elitePool(lexicon, 0.25).length).toBeGreaterThanOrEqual(24);
  });

  it("scores phonetic beauty with a primary-stress preference", () => {
    const lexicon = buildLexicon({ size: 80, seed: 9, morphology: false });
    const ranker = createPhoneticBeautyRanker();
    for (const entry of lexicon.slice(0, 20)) {
      expect(ranker.scoreWord(entry.word)).toBe(scorePhoneticBeauty(entry.word));
    }
  });

  it("chooses a jagged silhouette", () => {
    const rand = createSeededRng(42);
    const shape = chooseSilhouette(rand, 4, 6);
    expect(shape.length).toBeGreaterThanOrEqual(4);
    expect(shape.length).toBeLessThanOrEqual(6);
    expect(shape.every((n) => n >= 1 && n <= 7)).toBe(true);
  });

  it("composes free verse with variable lines and terminal pause 0", () => {
    const lexicon = buildLexicon({ size: 400, seed: 2026, morphology: false });
    const poem = composeFreeVerse(lexicon, {
      minLines: 4,
      maxLines: 6,
      rand: createSeededRng(99),
    });
    expect(poem.lexiconSize).toBe(400);
    expect(poem.lines.length).toBeGreaterThanOrEqual(3);
    expect(poem.lines[poem.lines.length - 1]!.pauseSec).toBe(0);
    for (let i = 0; i < poem.lines.length - 1; i++) {
      expect(poem.lines[i]!.pauseSec).toBeGreaterThan(0);
    }
    const lengths = poem.lines.map((l) => l.words.length);
    // Not a rigid 4×2 grid: at least one line differs in word count, or syllable mix varies.
    const syl = poem.lines.map((l) => l.words.reduce((n, w) => n + w.syllables.length, 0));
    const uniformWords = lengths.every((n) => n === lengths[0]);
    const uniformSyl = syl.every((n) => n === syl[0]);
    expect(uniformWords && uniformSyl).toBe(false);
    const forms = poem.lines.flatMap((l) => l.words.map((w) => w.written.clean.toLowerCase()));
    expect(new Set(forms).size).toBe(forms.length);
  });
});

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

  it("builds a deduped lexicon rich in short words", () => {
    const lexicon = buildLexicon({ size: 200, seed: 77, morphology: true, mode: "text" });
    expect(lexicon.length).toBe(200);
    const written = new Set(lexicon.map((e) => e.word.written.clean.toLowerCase()));
    expect(written.size).toBe(200);
    const mono = lexicon.filter((e) => e.word.syllables.length === 1).length;
    const bi = lexicon.filter((e) => e.word.syllables.length === 2).length;
    expect(mono).toBeGreaterThanOrEqual(60);
    expect(bi).toBeGreaterThanOrEqual(50);
    for (let i = 1; i < lexicon.length; i++) {
      expect(lexicon[i]!.score).toBeLessThanOrEqual(lexicon[i - 1]!.score);
    }
    const pool = elitePool(lexicon, 0.45);
    expect(pool.length).toBeGreaterThanOrEqual(32);
    expect(pool.some((e) => e.word.syllables.length === 1)).toBe(true);
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
    expect(shape.every((n) => n >= 1 && n <= 6)).toBe(true);
  });

  it("composes free verse with short-word variety and terminal pause 0", () => {
    const lexicon = buildLexicon({ size: 400, seed: 2026, morphology: true });
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
    const allWords = poem.lines.flatMap((l) => l.words);
    const mono = allWords.filter((w) => w.syllables.length === 1).length;
    const longer = allWords.filter((w) => w.syllables.length >= 2).length;
    const multiWordLines = poem.lines.filter((l) => l.words.length >= 2).length;
    expect(mono).toBeGreaterThanOrEqual(1);
    expect(longer).toBeGreaterThanOrEqual(1);
    expect(multiWordLines).toBeGreaterThanOrEqual(1);
    expect(allWords.every((w) => w.syllables.length <= 4)).toBe(true);
    const forms = allWords.map((w) => w.written.clean.toLowerCase());
    expect(new Set(forms).size).toBe(forms.length);
  });
});

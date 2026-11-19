import { describe, expect, it } from "vitest";
import { graphemes } from "./index.js";
import { vowelGraphemes } from "./vowels.js";
import { diphthongGraphemes } from "./diphthongs.js";

describe("withPositions isolatedSyllableWeight", () => {
  it("preserves an explicit positive isolatedSyllableWeight from inventory", () => {
    const raw = vowelGraphemes.find(g => g.phoneme === "ʊ" && g.form === "oo");
    expect(raw?.isolatedSyllableWeight).toBe(3);
    const baked = graphemes.find(
      g => g.phoneme === "ʊ" && g.form === "oo" && !g.fallbackOnly,
    );
    expect(baked?.isolatedSyllableWeight).toBe(3);
  });

  it("preserves an explicit zero isolatedSyllableWeight from inventory", () => {
    const raw = diphthongGraphemes.find(g => g.phoneme === "aɪ" && g.form === "ai");
    expect(raw?.isolatedSyllableWeight).toBe(0);
    const baked = graphemes.find(g => g.phoneme === "aɪ" && g.form === "ai");
    expect(baked?.isolatedSyllableWeight).toBe(0);
  });

  it("still derives isolatedSyllableWeight when inventory omits it", () => {
    const raw = vowelGraphemes.find(g => g.phoneme === "æ" && g.form === "a");
    expect(raw?.isolatedSyllableWeight).toBeUndefined();
    const baked = graphemes.find(g => g.phoneme === "æ" && g.form === "a");
    // /æ/ "a" has both edges > 0 → max(start, mid, end).
    expect(baked?.isolatedSyllableWeight).toBe(
      Math.max(raw!.startWord, raw!.midWord, raw!.endWord),
    );
  });
});

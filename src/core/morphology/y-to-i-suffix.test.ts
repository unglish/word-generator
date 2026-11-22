/**
 * Regression tests for #458: consonant+y → i before non-i-initial suffixes.
 *
 * Targeted cases find traced examples by property. Distribution coverage uses the same
 * 1000000–1019999 window as the issue sample.
 */
import { describe, expect, it } from "vitest";
import { generateWord } from "../../index.js";
import { findExample } from "../../test-support/find-example.js";

/** Assembled morphological root after boundary transforms. */
function assembledRoot(word: ReturnType<typeof generateWord>): string {
  return (
    word.trace?.morphology?.realization?.assembledParts.find(
      (part) => part.role === "root",
    )?.text ?? ""
  );
}

/** True consonant+y stem: base spelling ends in Cy, not the /aɪ/ digraph `ye`. */
function isTrueConsonantYBase(word: ReturnType<typeof generateWord>): boolean {
  const base = word.trace?.baseSpelling?.surface ?? "";
  return /[^aeiou]y$/i.test(base) && !/ye$/i.test(base);
}

const I_INITIAL = /^(ing|ist|ism|ive|ity|ize|ian|ial|ish)/i;

describe("consonant+y suffix boundary (#458)", () => {
  // Each case finds its own example: pinned seeds broke whenever unrelated
  // output changes moved the random stream (seed 1001223 after #474).
  it.each([
    { suffix: "s", expectWord: /ies$/ },
    { suffix: "ed", expectWord: /ied$/ },
    { suffix: "est", expectWord: /iest$/ },
    { suffix: "al", expectWord: /ial$/ },
    { suffix: "ment", expectWord: /iment$/ },
    { suffix: "ous", expectWord: /ious$/ },
  ])(
    "applies y→i on a consonant+y root before -$suffix",
    ({ suffix, expectWord }) => {
      const { word } = findExample(
        (w) => w.trace?.morphology?.suffix === suffix && isTrueConsonantYBase(w),
        { property: `a consonant+y root before -${suffix}`, limit: 20_000, firstSeed: 1_000_000 },
      );
      expect(assembledRoot(word)).toMatch(/[^aeiou]i$/i);
      expect(word.written.clean).toMatch(expectWord);
      expect(word.written.clean).not.toMatch(/[^aeiou]y(s|ed|er|est|al|ment|ous)$/i);
    },
  );

  it("uses -es spelling on a consonant+y plural without adding a syllable", () => {
    const { word } = findExample(
      (w) => w.trace?.morphology?.suffix === "s" && isTrueConsonantYBase(w),
      { property: "a consonant+y plural", limit: 20_000, firstSeed: 1_000_000 },
    );
    const realization = word.trace!.morphology!.realization!;
    expect(assembledRoot(word)).toMatch(/[^aeiou]i$/i);
    expect(word.written.clean).toMatch(/ies$/);
    expect(realization.suffix!.resolved.written).toBe("es");
    expect(realization.suffix!.resolved.phonemes).toEqual(["z"]);
    expect(realization.suffix!.resolved.syllableCount).toBe(0);
  });

  it("keeps y before i-initial -ing on a consonant+y root", () => {
    const { word } = findExample(
      (w) => w.trace?.morphology?.suffix === "ing" && isTrueConsonantYBase(w),
      { property: "a consonant+y root before -ing", limit: 20_000, firstSeed: 1_000_000 },
    );
    expect(assembledRoot(word)).toMatch(/[^aeiou]y$/i);
    expect(word.written.clean).toMatch(/ying$/);
  });

  it("leaves vowel+y unchanged before -s", () => {
    const { word } = findExample(
      (w) => w.trace?.morphology?.suffix === "s" && /[aeiou]y$/i.test(w.trace.baseSpelling?.surface ?? ""),
      { property: "a vowel+y plural", limit: 20_000, firstSeed: 1_000_000 },
    );
    expect(assembledRoot(word)).toMatch(/[aeiou]y$/i);
    expect(word.written.clean).toMatch(/ys$/);
  });

  it("clears true consonant+y before non-i suffixes over the issue sample", () => {
    let kept = 0;
    const examples: Array<{ seed: number; word: string; suffix: string }> = [];
    for (let seed = 1_000_000; seed <= 1_019_999; seed++) {
      const word = generateWord({ seed, trace: true });
      const morphology = word.trace?.morphology;
      if (!morphology?.suffix || morphology.template === "bare") continue;
      if (I_INITIAL.test(morphology.suffix)) continue;
      if (!isTrueConsonantYBase(word)) continue;
      const root = assembledRoot(word);
      if (!/[^aeiou]y$/i.test(root)) continue;
      kept++;
      if (examples.length < 5) {
        examples.push({
          seed,
          word: word.written.clean,
          suffix: morphology.suffix,
        });
      }
    }
    expect(examples, `unexpected kept C+y: ${JSON.stringify(examples)}`).toEqual(
      [],
    );
    expect(kept).toBe(0);
  });
});

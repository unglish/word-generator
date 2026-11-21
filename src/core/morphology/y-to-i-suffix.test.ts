/**
 * Regression tests for #458: consonant+y → i before non-i-initial suffixes.
 *
 * Seeds are pinned from the issue (exact failing cases). Distribution coverage
 * uses the same 1000000–1019999 window as the issue sample.
 */
import { describe, expect, it } from "vitest";
import { generateWord } from "../../index.js";

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
  it.each([
    { seed: 1000034, before: "flys", expectSuffix: "s", expectWord: /ies$/ },
    { seed: 1000084, before: "tisbryed", expectSuffix: "ed", expectWord: /ied$/ },
    { seed: 1000303, before: "ettigryed", expectSuffix: "ed", expectWord: /ied$/ },
    { seed: 1000395, before: "jilyelyest", expectSuffix: "est", expectWord: /iest$/ },
    { seed: 1001223, before: "warglyal", expectSuffix: "al", expectWord: /ial$/ },
    { seed: 1000119, before: "tanoshyment", expectSuffix: "ment", expectWord: /iment$/ },
    { seed: 1002044, before: "cichyous", expectSuffix: "ous", expectWord: /ious$/ },
  ])(
    "seed $seed ($before) applies y→i before -$expectSuffix",
    ({ seed, expectSuffix, expectWord }) => {
      const word = generateWord({ seed, trace: true });
      expect(word.trace?.morphology?.suffix).toBe(expectSuffix);
      expect(isTrueConsonantYBase(word)).toBe(true);
      expect(assembledRoot(word)).toMatch(/[^aeiou]i$/i);
      expect(word.written.clean).toMatch(expectWord);
      expect(word.written.clean).not.toMatch(/[^aeiou]y(s|ed|er|est|al|ment|ous)$/i);
    },
  );

  it("seed 1000034 is flies with -es spelling and no extra /ɪz/ syllable", () => {
    const word = generateWord({ seed: 1000034, trace: true });
    expect(word.written.clean).toBe("flies");
    const realization = word.trace!.morphology!.realization!;
    expect(realization.assembledParts).toEqual([
      { role: "root", text: "fli" },
      { role: "suffix", text: "es" },
    ]);
    expect(realization.suffix!.resolved.written).toBe("es");
    expect(realization.suffix!.resolved.phonemes).toEqual(["z"]);
    expect(realization.suffix!.resolved.syllableCount).toBe(0);
  });

  it("keeps y before i-initial -ing on a consonant+y root", () => {
    // Seed from post-fix sample: murpidy + -ing
    const word = generateWord({ seed: 1001183, trace: true });
    expect(word.trace?.morphology?.suffix).toBe("ing");
    expect(assembledRoot(word)).toMatch(/[^aeiou]y$/i);
    expect(word.written.clean).toBe("murpidying");
  });

  it("leaves vowel+y unchanged before -s", () => {
    const word = generateWord({ seed: 1001403, trace: true });
    expect(word.trace?.morphology?.suffix).toBe("s");
    expect(assembledRoot(word)).toMatch(/[aeiou]y$/i);
    expect(word.written.clean).toBe("blays");
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

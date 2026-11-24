import { describe, expect, it } from "vitest";
import { createGenerator, createSeededRng, englishConfig, generateWord } from "../index.js";
import type { GenerationWeights } from "../config/language.js";
import reference from "../../evaluation/corpus/stage-references.json";
import { lengthTotalVariationPct } from "./stage-quality.js";

const { generationWeights } = englishConfig;

function generator(onsetLength: GenerationWeights["onsetLength"]) {
  return createGenerator({
    ...englishConfig,
    phonemeLengthWeights: { ...englishConfig.phonemeLengthWeights, lexicon: [[7, 1]] },
    phonemeToSyllableWeights: { ...englishConfig.phonemeToSyllableWeights, lexicon: { 7: [[2, 1]] } },
    generationWeights: {
      ...generationWeights,
      onsetLength,
      codaLength: {
        ...generationWeights.codaLength,
        rootFinalByMode: { lexicon: { counts: { "n,t": 1 }, lengths: { 2: { 7: [[0, 1], [2, 1]] } } } },
      },
    },
  });
}

describe("root-initial onset lengths", () => {
  it("locks eligible root edges and reserves a consonant for the medial boundary", () => {
    const gen = generator({
      ...generationWeights.onsetLength,
      rootInitialByMode: { lexicon: { 2: { 7: { 0: [[0, 1]], 2: [[2, 1], [3, 1000]] } } } },
    });

    const edges = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const word = gen.generateWord({ seed, mode: "lexicon", morphology: false, trace: true });
      const plans = word.trace!.syllablePlans!;
      expect(plans).toHaveLength(2);
      expect(plans.reduce((phones, { onsetLength, codaLength }) => phones + onsetLength + codaLength + 1, 0))
        .toBe(7);
      edges.add(`${plans[0].onsetLength}:${plans[1].codaLength}`);
    }
    expect(edges).toEqual(new Set(["0:0", "2:2"]));
  });

  it("rejects an onset weight that exceeds its joint consonant budget", () => {
    expect(() => generator({
      ...generationWeights.onsetLength,
      rootInitialByMode: { lexicon: { 2: { 7: { 2: [[4, 1]] } } } },
    })).toThrow(/invalid onset length or count/);
  });

  it("brings the full initial-onset distribution of common root lengths near the reference", () => {
    const sizes = [2, 3] as const;
    const counts: Record<number, Record<string, number>> = { 2: {}, 3: {} };
    const rand = createSeededRng(101601885);
    for (let i = 0; i < 10_000; i++) {
      const { lexical } = generateWord({ rand, mode: "lexicon" });
      const root = lexical!.root;
      const row = counts[root.length];
      if (!row) continue;
      const onsetLength = root[0].onset.length;
      row[onsetLength] = (row[onsetLength] ?? 0) + 1;
    }

    for (const size of sizes) {
      expect(lengthTotalVariationPct(counts[size], reference.roots.initialOnsetLengths[size]), `root syllables: ${size}`)
        .toBeLessThan(3.5);
    }
  });
});

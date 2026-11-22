import { describe, expect, it } from "vitest";
import { generateWord } from "../index.js";
import { createSeededRng } from "../utils/random.js";
import normalization from "../../data/cmu/phoneme-normalization.json";
import references from "../../evaluation/corpus/stage-references.json";
import thresholds from "../config/phoneme-thresholds.json";
import { totalVariationPct, toPercentMap } from "./distribution-quality.js";
import { computePhonemeQualityMetrics } from "./phoneme-quality.js";
import { countNormalizedPhonemes } from "./phoneme-normalization.js";

const { seed, sampleSize, minCommonBaselinePct } = thresholds;

function meanSyllables(counts: Record<string, number>): number {
  return Object.entries(toPercentMap(counts)).reduce(
    (total, [length, pct]) => total + Number(length) * pct / 100, 0,
  );
}

describe("Lexicon stage quality", () => {
  it.each(["roots", "fullCmu"] as const)("matches the %s phoneme reference", (stage) => {
    const morphology = stage === "fullCmu";
    const rand = createSeededRng(seed);
    const syllableCounts: Record<string, number> = {};
    function* sample() {
      for (let i = 0; i < sampleSize; i++) {
        const word = generateWord({ mode: "lexicon", rand, morphology });
        const length = word.syllables.length;
        syllableCounts[length] = (syllableCounts[length] ?? 0) + 1;
        yield word;
      }
    }
    const { counts, losses } = countNormalizedPhonemes(sample(), normalization);
    const reference = references[stage];
    const limits = thresholds[stage];
    const metrics = computePhonemeQualityMetrics(counts, reference.phonemes, minCommonBaselinePct);
    const [over] = metrics.topOverRepresented;
    const [under] = metrics.topUnderRepresented;
    const [gap] = metrics.topAbsoluteGap;

    expect(losses).toEqual({});
    expect(metrics.nonCmuMassPct).toBeLessThanOrEqual(thresholds.maxGeneratedOnlyMassPct);
    expect(metrics.cmuOnlyKeyCount).toBeLessThanOrEqual(thresholds.maxCmuOnlyKeyCount);
    expect(metrics.totalVariationPct).toBeLessThanOrEqual(limits.maxTotalVariationPct);
    expect(over.ratio, over.phoneme).toBeLessThanOrEqual(limits.maxOverRepresentation);
    expect(under.ratio, under.phoneme).toBeGreaterThanOrEqual(limits.minRepresentation);
    expect(gap.absGapPct, gap.phoneme).toBeLessThanOrEqual(limits.maxAbsoluteGapPct);

    if (morphology) {
      expect(totalVariationPct(toPercentMap(syllableCounts), toPercentMap(reference.syllables)))
        .toBeLessThanOrEqual(1);
      expect(Math.abs(meanSyllables(syllableCounts) - meanSyllables(reference.syllables)))
        .toBeLessThanOrEqual(0.03);
    }
  }, 120_000);
});

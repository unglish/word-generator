import { describe, expect, it } from "vitest";
import { generateWord } from "../index.js";
import { createSeededRng } from "../utils/random.js";
import normalization from "../../data/cmu/phoneme-normalization.json";
import references from "../../evaluation/corpus/stage-references.json";
import thresholds from "../config/phoneme-thresholds.json";
import { lengthTotalVariationPct, meanSyllableGap } from "./stage-quality.js";
import { computePhonemeQualityMetrics } from "./phoneme-quality.js";
import { countNormalizedPhonemes } from "./phoneme-normalization.js";

const { seed, sampleSize, minCommonBaselinePct } = thresholds;

function unstressedVowelShares(counts: Readonly<Record<string, number>>) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const weak = (counts["ə"] ?? 0) + (counts["ɪ"] ?? 0);
  const rhotic = (counts["ɚ"] ?? 0) + (counts["ɜ"] ?? 0);
  return { weak: 100 * weak / total, full: 100 * (total - weak - rhotic) / total };
}

const cmuUnstressed: Record<string, number> = {};
for (const position of ["initial", "medial", "final"] as const) {
  for (const [sound, count] of Object.entries(references.roots.nucleiByStress.unstressed[position])) {
    cmuUnstressed[sound] = (cmuUnstressed[sound] ?? 0) + count;
  }
}

describe("Lexicon stage quality", () => {
  it.each(["roots", "fullCmu"] as const)("matches the %s phoneme reference", (stage) => {
    const morphology = stage === "fullCmu";
    const rand = createSeededRng(seed);
    const syllableCounts: Record<string, number> = {};
    const codaCounts: Record<string, number> = {};
    const unstressedNuclei: Record<string, number> = {};
    function* sample() {
      for (let i = 0; i < sampleSize; i++) {
        const word = generateWord({ mode: "lexicon", rand, morphology });
        const length = word.syllables.length;
        syllableCounts[length] = (syllableCounts[length] ?? 0) + 1;
        const finalCoda = word.syllables.at(-1)!.coda.length;
        codaCounts[finalCoda] = (codaCounts[finalCoda] ?? 0) + 1;
        if (!morphology && length > 1) {
          for (const syllable of word.syllables) {
            if (syllable.stress) continue;
            for (const { sound } of syllable.nucleus) {
              unstressedNuclei[sound] = (unstressedNuclei[sound] ?? 0) + 1;
            }
          }
        }
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

    if (stage === "fullCmu") {
      expect(lengthTotalVariationPct(syllableCounts, references.fullCmu.syllables))
        .toBeLessThanOrEqual(thresholds.fullCmu.maxFinishedSyllableTV);
      expect(meanSyllableGap(syllableCounts, references.fullCmu.syllables))
        .toBeLessThanOrEqual(thresholds.fullCmu.maxFinishedMeanSyllableGap);
    } else {
      expect(lengthTotalVariationPct(codaCounts, references.roots.finalCodaLengths))
        .toBeLessThanOrEqual(thresholds.roots.maxRootFinalCodaTV);
      const actual = unstressedVowelShares(unstressedNuclei);
      const target = unstressedVowelShares(cmuUnstressed);
      expect(Math.abs(actual.weak - target.weak), "unstressed schwa + KIT gap")
        .toBeLessThanOrEqual(thresholds.roots.maxUnstressedWeakVowelGapPct);
      expect(Math.abs(actual.full - target.full), "unstressed non-rhotic full-vowel gap")
        .toBeLessThanOrEqual(thresholds.roots.maxUnstressedFullVowelGapPct);
    }
  }, 120_000);
});

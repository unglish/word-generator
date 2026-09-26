import { compareDistributions, pearson, toPercentMap } from "./distribution-quality.js";
import type { DistributionQuality } from "./distribution-quality.js";
export { pearson, toPercentMap } from "./distribution-quality.js";

export interface PhonemeComparisonRow {
  phoneme: string;
  generatedPct: number;
  baselinePct: number;
  ratio: number;
  gapPct: number;
  absGapPct: number;
}

export interface PhonemeQualityMetrics extends DistributionQuality {
  sharedKeyCount: number;
  generatedOnlyKeyCount: number;
  cmuOnlyKeyCount: number;
  sharedPearsonR: number;
  nonCmuMassPct: number;
  coverageAdjustedR: number;
  generatedOnlyPhonemes: Array<{ phoneme: string; generatedPct: number }>;
  topOverRepresented: PhonemeComparisonRow[];
  topUnderRepresented: PhonemeComparisonRow[];
  topAbsoluteGap: PhonemeComparisonRow[];
}

export function computePhonemeQualityMetrics(
  generatedCounts: Record<string, number>,
  baselineCounts: Record<string, number>,
  minCommonBaselinePct: number,
): PhonemeQualityMetrics {
  const generatedPct = toPercentMap(generatedCounts);
  const baselinePct = toPercentMap(baselineCounts);

  const generatedKeys = new Set(Object.keys(generatedPct).filter(key => generatedPct[key] > 0));
  const baselineKeys = new Set(Object.keys(baselinePct).filter(key => baselinePct[key] > 0));

  const sharedKeys = [...generatedKeys].filter(k => baselineKeys.has(k));
  const generatedOnlyKeys = [...generatedKeys].filter(k => !baselineKeys.has(k));
  const baselineOnlyKeys = [...baselineKeys].filter(k => !generatedKeys.has(k));

  const nonCmuMassPct = generatedOnlyKeys.reduce((sum, k) => sum + generatedPct[k], 0);
  const sharedPearsonR = sharedKeys.length > 1
    ? pearson(sharedKeys.map(k => generatedPct[k]), sharedKeys.map(k => baselinePct[k]))
    : 0;
  const coverageAdjustedR = sharedPearsonR * (1 - nonCmuMassPct / 100);

  const commonBaseline = [...baselineKeys].filter(k => baselinePct[k] >= minCommonBaselinePct);

  const rows = commonBaseline.map((phoneme): PhonemeComparisonRow => {
    const gen = generatedPct[phoneme] || 0;
    const base = baselinePct[phoneme] || 0;
    return {
      phoneme,
      generatedPct: gen,
      baselinePct: base,
      ratio: base > 0 ? gen / base : 0,
      gapPct: gen - base,
      absGapPct: Math.abs(gen - base),
    };
  });

  const generatedOnlyPhonemes = generatedOnlyKeys
    .map(phoneme => ({ phoneme, generatedPct: generatedPct[phoneme] }))
    .sort((a, b) => b.generatedPct - a.generatedPct);

  return {
    ...compareDistributions(generatedCounts, baselineCounts),
    sharedKeyCount: sharedKeys.length,
    generatedOnlyKeyCount: generatedOnlyKeys.length,
    cmuOnlyKeyCount: baselineOnlyKeys.length,
    sharedPearsonR,
    nonCmuMassPct,
    coverageAdjustedR,
    generatedOnlyPhonemes,
    topOverRepresented: [...rows].sort((a, b) => b.ratio - a.ratio),
    topUnderRepresented: [...rows].sort((a, b) => a.ratio - b.ratio),
    topAbsoluteGap: [...rows].sort((a, b) => b.absGapPct - a.absGapPct),
  };
}

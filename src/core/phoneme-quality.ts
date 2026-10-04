import { compareDistributions, pearson, toPercentMap } from "./distribution-quality.js";
import type { DistributionQuality } from "./distribution-quality.js";

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

export interface PhonemeKeyPartition {
  shared: string[];
  generatedOnly: string[];
  baselineOnly: string[];
}

/** Splits percent maps by presence; explicit zero counts are treated as absent. */
export function partitionPhonemeKeys(
  generatedPct: Record<string, number>,
  baselinePct: Record<string, number>,
): PhonemeKeyPartition {
  const generatedKeys = new Set(Object.keys(generatedPct).filter(key => generatedPct[key] > 0));
  const baselineKeys = new Set(Object.keys(baselinePct).filter(key => baselinePct[key] > 0));
  return {
    shared: [...generatedKeys].filter(k => baselineKeys.has(k)),
    generatedOnly: [...generatedKeys].filter(k => !baselineKeys.has(k)),
    baselineOnly: [...baselineKeys].filter(k => !generatedKeys.has(k)),
  };
}

export function computePhonemeQualityMetrics(
  generatedCounts: Record<string, number>,
  baselineCounts: Record<string, number>,
  minCommonBaselinePct: number,
): PhonemeQualityMetrics {
  const generatedPct = toPercentMap(generatedCounts);
  const baselinePct = toPercentMap(baselineCounts);

  const { shared: sharedKeys, generatedOnly: generatedOnlyKeys, baselineOnly: baselineOnlyKeys } =
    partitionPhonemeKeys(generatedPct, baselinePct);

  const nonCmuMassPct = generatedOnlyKeys.reduce((sum, k) => sum + generatedPct[k], 0);
  const sharedPearsonR = sharedKeys.length > 1
    ? pearson(sharedKeys.map(k => generatedPct[k]), sharedKeys.map(k => baselinePct[k]))
    : 0;
  const coverageAdjustedR = sharedPearsonR * (1 - nonCmuMassPct / 100);

  const commonBaseline = Object.keys(baselinePct).filter(k => baselinePct[k] > 0 && baselinePct[k] >= minCommonBaselinePct);

  const rows = commonBaseline.map((phoneme): PhonemeComparisonRow => {
    const gen = generatedPct[phoneme] || 0;
    const base = baselinePct[phoneme];
    return {
      phoneme,
      generatedPct: gen,
      baselinePct: base,
      ratio: gen / base,
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

import { toPercentMap, totalVariationPct } from "./distribution-quality.js";

export function lengthTotalVariationPct(
  counts: Record<string, number>,
  reference: Record<string, number>,
): number {
  return totalVariationPct(toPercentMap(counts), toPercentMap(reference));
}

export function meanSyllableGap(
  counts: Record<string, number>,
  reference: Record<string, number>,
): number {
  function mean(values: Record<string, number>): number {
    return Object.entries(toPercentMap(values)).reduce(
      (total, [length, pct]) => total + Number(length) * pct / 100, 0,
    );
  }
  return Math.abs(mean(counts) - mean(reference));
}

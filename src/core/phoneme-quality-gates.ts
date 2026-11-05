import type { PhonemeComparisonRow } from "./phoneme-quality.js";

export interface PhonemeGateLimits {
  maxOverRepresentation: number;
  minRepresentation: number;
  maxAbsoluteGapPct: number;
  /** Reviewed exceptions for individual phones; all unspecified bounds stay global. */
  phonemeOverrides?: Record<string, {
    maxOverRepresentation?: number;
    maxAbsoluteGapPct?: number;
  }>;
}

export interface PhonemeGateViolation {
  phoneme: string;
  metric: "overRepresentation" | "underRepresentation" | "absoluteGapPct";
  value: number;
  limit: number;
}

export function phonemeLimits(phoneme: string, limits: PhonemeGateLimits) {
  const override = limits.phonemeOverrides?.[phoneme];
  return {
    maxOverRepresentation: override?.maxOverRepresentation ?? limits.maxOverRepresentation,
    minRepresentation: limits.minRepresentation,
    maxAbsoluteGapPct: override?.maxAbsoluteGapPct ?? limits.maxAbsoluteGapPct,
  };
}

/** Check every common phone: the largest raw metric may have a different limit. */
export function phonemeGateViolations(
  rows: readonly PhonemeComparisonRow[],
  limits: PhonemeGateLimits,
): PhonemeGateViolation[] {
  const violations: PhonemeGateViolation[] = [];
  for (const row of rows) {
    const bound = phonemeLimits(row.phoneme, limits);
    if (row.ratio > bound.maxOverRepresentation) {
      violations.push({ phoneme: row.phoneme, metric: "overRepresentation", value: row.ratio, limit: bound.maxOverRepresentation });
    }
    if (row.ratio < bound.minRepresentation) {
      violations.push({ phoneme: row.phoneme, metric: "underRepresentation", value: row.ratio, limit: bound.minRepresentation });
    }
    if (row.absGapPct > bound.maxAbsoluteGapPct) {
      violations.push({ phoneme: row.phoneme, metric: "absoluteGapPct", value: row.absGapPct, limit: bound.maxAbsoluteGapPct });
    }
  }
  return violations;
}

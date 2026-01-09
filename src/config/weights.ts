/**
 * Pre-computed weight tables for fast weighted random selection.
 * These are initialized once at module load and reused throughout generation.
 */

import { precomputeWeights, PrecomputedWeights } from "../utils/precomputedWeights.js";

// ============================================================================
// Boolean weight tables (true/false decisions)
// ============================================================================

/** 95% true, 5% false */
export const BOOL_95_5: PrecomputedWeights<boolean> = precomputeWeights([
  [true, 95],
  [false, 5],
]);

/** 90% true, 10% false */
export const BOOL_90_10: PrecomputedWeights<boolean> = precomputeWeights([
  [true, 90],
  [false, 10],
]);

/** 80% true, 20% false */
export const BOOL_80_20: PrecomputedWeights<boolean> = precomputeWeights([
  [true, 80],
  [false, 20],
]);

/** 70% true, 30% false */
export const BOOL_70_30: PrecomputedWeights<boolean> = precomputeWeights([
  [true, 70],
  [false, 30],
]);

/** 50% true, 50% false */
export const BOOL_50_50: PrecomputedWeights<boolean> = precomputeWeights([
  [true, 50],
  [false, 50],
]);

/** 40% true, 60% false */
export const BOOL_40_60: PrecomputedWeights<boolean> = precomputeWeights([
  [true, 40],
  [false, 60],
]);

/** 30% true, 70% false */
export const BOOL_30_70: PrecomputedWeights<boolean> = precomputeWeights([
  [true, 30],
  [false, 70],
]);

/** 15% true, 85% false */
export const BOOL_15_85: PrecomputedWeights<boolean> = precomputeWeights([
  [true, 15],
  [false, 85],
]);

/** 5% true, 95% false */
export const BOOL_5_95: PrecomputedWeights<boolean> = precomputeWeights([
  [true, 5],
  [false, 95],
]);

// ============================================================================
// Syllable structure weights
// ============================================================================

/** Syllable count distribution for multi-syllable words */
export const SYLLABLE_COUNT: PrecomputedWeights<number> = precomputeWeights([
  [1, 5000],
  [2, 30000],
  [3, 29700],
  [4, 3000],
  [5, 200],
  [6, 50],
  [7, 5],
]);

/** Onset length for monosyllabic words */
export const ONSET_LENGTH_MONOSYLLABIC: PrecomputedWeights<number> = precomputeWeights([
  [0, 50],
  [1, 100],
  [2, 200],
  [3, 150],
]);

/** Onset length for polysyllabic words (following nucleus) */
export const ONSET_LENGTH_FOLLOWING_NUCLEUS: PrecomputedWeights<number> = precomputeWeights([
  [0, 0],
  [1, 675],
  [2, 125],
  [3, 80],
]);

/** Onset length for polysyllabic words (not following nucleus) */
export const ONSET_LENGTH_DEFAULT: PrecomputedWeights<number> = precomputeWeights([
  [0, 150],
  [1, 675],
  [2, 125],
  [3, 80],
]);

// ============================================================================
// Coda length weights by onset length (for monosyllabic words)
// ============================================================================

export const CODA_LENGTH_MONO_ONSET_0: PrecomputedWeights<number> = precomputeWeights([
  [0, 20],
  [1, 100],
  [2, 200],
  [3, 150],
]);

export const CODA_LENGTH_MONO_ONSET_1: PrecomputedWeights<number> = precomputeWeights([
  [0, 80],
  [1, 150],
  [2, 150],
  [3, 100],
]);

export const CODA_LENGTH_MONO_ONSET_2: PrecomputedWeights<number> = precomputeWeights([
  [0, 50],
  [1, 200],
  [2, 100],
  [3, 50],
]);

export const CODA_LENGTH_MONO_ONSET_3: PrecomputedWeights<number> = precomputeWeights([
  [0, 100],
  [1, 300],
  [2, 50],
  [3, 20],
]);

export const CODA_LENGTH_MONO_ONSET_DEFAULT: PrecomputedWeights<number> = precomputeWeights([
  [0, 150],
  [1, 200],
  [2, 30],
  [3, 10],
]);

/** Coda length for polysyllabic end-of-word */
export const CODA_LENGTH_POLY_END: PrecomputedWeights<number> = precomputeWeights([
  [0, 1200],
  [1, 3000],
  [2, 900],
  [3, 100],
]);

/** Coda length for polysyllabic mid-word */
export const CODA_LENGTH_POLY_MID: PrecomputedWeights<number> = precomputeWeights([
  [0, 6000],
  [1, 3000],
  [2, 900],
  [3, 100],
]);

// ============================================================================
// Stress weights
// ============================================================================

/** Primary stress for disyllabic words (index 0 or 1) */
export const PRIMARY_STRESS_DISYLLABIC: PrecomputedWeights<number> = precomputeWeights([
  [0, 70],
  [1, 30],
]);

// ============================================================================
// Helper to get coda length weights for monosyllabic by onset length
// ============================================================================

const CODA_LENGTH_MONO_BY_ONSET: PrecomputedWeights<number>[] = [
  CODA_LENGTH_MONO_ONSET_0,
  CODA_LENGTH_MONO_ONSET_1,
  CODA_LENGTH_MONO_ONSET_2,
  CODA_LENGTH_MONO_ONSET_3,
];

export function getCodaLengthMonoByOnset(onsetLength: number): PrecomputedWeights<number> {
  return CODA_LENGTH_MONO_BY_ONSET[onsetLength] ?? CODA_LENGTH_MONO_ONSET_DEFAULT;
}

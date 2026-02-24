/**
 * Configuration constants for word generation weights and probabilities.
 *
 * These were previously inline magic numbers in generate.ts.
 * Each constant documents what it controls so future tuning is straightforward.
 */

// ---------------------------------------------------------------------------
// Sonority bonuses
// ---------------------------------------------------------------------------

/** Sonority bonus applied to voiced phonemes. */
export const VOICED_BONUS = 0.5;

/** Sonority bonus applied to tense phonemes. */
export const TENSE_BONUS = 0.25;

// ---------------------------------------------------------------------------
// Onset length weights
// ---------------------------------------------------------------------------

/** Onset length weights for monosyllabic words. CMU: only ~4% have no onset. */
export const ONSET_LENGTH_MONOSYLLABIC: [number, number][] = [
  [0, 5],
  [1, 100],
  [2, 200],
  [3, 150],
];

/** Onset length weights for polysyllabic words (following a nucleus with no coda). */
export const ONSET_LENGTH_FOLLOWING_NUCLEUS: [number, number][] = [
  [0, 0],
  [1, 675],
  [2, 125],
  [3, 80],
];

/** Onset length weights for polysyllabic words (default). */
export const ONSET_LENGTH_DEFAULT: [number, number][] = [
  [0, 30],
  [1, 675],
  [2, 125],
  [3, 80],
];

/** Onset length weights for longer words (4+ syllables). More empty onsets to match CMU. */
export const ONSET_LENGTH_LONG: [number, number][] = [
  [0, 150],
  [1, 675],
  [2, 60],
  [3, 20],
];

// ---------------------------------------------------------------------------
// Coda length weights
// ---------------------------------------------------------------------------

/** Coda length weights for monosyllabic words, keyed by onset length. CMU: ~6% have no coda. */
export const CODA_LENGTH_MONOSYLLABIC: Record<number, [number, number][]> = {
  0: [[0, 10], [1, 100], [2, 200], [3, 150]],
  1: [[0, 20], [1, 150], [2, 150], [3, 100]],
  2: [[0, 15], [1, 200], [2, 100], [3, 50]],
  3: [[0, 30], [1, 300], [2, 50], [3, 20]],
};

/** Coda length weights for monosyllabic words with onset length >= 4 (fallback). */
export const CODA_LENGTH_MONOSYLLABIC_DEFAULT: [number, number][] = [
  [0, 150],
  [1, 200],
  [2, 30],
  [3, 10],
];

/** Coda length weight for the zero-length option in polysyllabic words (end of word). */
export const CODA_ZERO_WEIGHT_END_OF_WORD = 1200;

/** Coda length weight for the zero-length option in polysyllabic words (mid word). */
export const CODA_ZERO_WEIGHT_MID_WORD = 6000;

/** Coda length weights for polysyllabic words (non-zero lengths). */
export const CODA_LENGTH_POLYSYLLABIC_NONZERO: [number, number][] = [
  [1, 3000],
  [2, 900],
  [3, 100],
];

// ---------------------------------------------------------------------------
// Final 's' suffix probability
// ---------------------------------------------------------------------------

/** Chance (out of 100) to append a final 's' phoneme at end of word. */
export const FINAL_S_CHANCE = 8;

// ---------------------------------------------------------------------------
// Syllable boundary adjustment
// ---------------------------------------------------------------------------

/** Chance (out of 100) to drop a coda phoneme when sonority equals the following onset. */
export const BOUNDARY_DROP_CHANCE = 90;

// ---------------------------------------------------------------------------
// Nasal + homorganic stop extension
// ---------------------------------------------------------------------------

/**
 * Chance (out of 100) that a word-final singleton nasal coda is extended
 * with its voiced homorganic stop (n → nd, m → mb, ŋ → ŋg).
 */
export const NASAL_STOP_EXTENSION_CHANCE = 18;

// ---------------------------------------------------------------------------
// Onset / coda presence probabilities
// ---------------------------------------------------------------------------

/** Chance (out of 100) that the first syllable has an onset. CMU: ~96% of monosyllables have onsets. */
export const HAS_ONSET_START_OF_WORD = 95;

/** Chance (out of 100) that a non-initial syllable has an onset when the previous syllable has a coda. CMU: ~93%. */
export const HAS_ONSET_AFTER_CODA = 90;

/** Chance (out of 100) that a monosyllabic word has a coda. CMU: ~94%. */
export const HAS_CODA_MONOSYLLABIC = 94;

/** Chance (out of 100) that the final syllable of a polysyllabic word has a coda. CMU: ~93% for 2-syl. */
export const HAS_CODA_END_OF_WORD = 90;

/** Chance (out of 100) that a non-final syllable of a polysyllabic word has a coda. CMU: ~60% for 2-syl mid. */
export const HAS_CODA_MID_WORD = 55;

// ---------------------------------------------------------------------------
// Top-down phoneme-length targets
// ---------------------------------------------------------------------------

/**
 * Phoneme-length weights for text mode.
 *
 * Derived from a 300k deterministic sample of the pre-top-down generator's
 * text mode to preserve existing text-mode behavior while moving to a single
 * top-down generation architecture.
 */
export const PHONEME_LENGTH_WEIGHTS_TEXT: [number, number][] = [
  [1, 0.0287],
  [2, 4.2780],
  [3, 23.6590],
  [4, 33.6380],
  [5, 16.4103],
  [6, 7.5700],
  [7, 5.1717],
  [8, 3.7183],
  [9, 2.4230],
  [10, 1.5167],
  [11, 0.8323],
  [12, 0.4240],
  [13, 0.1887],
  [14, 0.0767],
  [15, 0.0367],
  [16, 0.0173],
  [17, 0.0067],
  [18, 0.0027],
  [19, 0.0010],
  [20, 0.0003],
];

/**
 * Phoneme-length weights for lexicon mode.
 *
 * Derived from CMU Pronouncing Dictionary (`cmudict.dict`), excluding
 * alternate pronunciations (word(2), word(3), ...), total 126,044 entries.
 */
export const PHONEME_LENGTH_WEIGHTS_LEXICON: [number, number][] = [
  [1, 0.0325],
  [2, 0.7386],
  [3, 5.2172],
  [4, 12.5504],
  [5, 19.5559],
  [6, 20.3857],
  [7, 15.5779],
  [8, 11.1747],
  [9, 6.7691],
  [10, 3.7685],
  [11, 2.0985],
  [12, 1.1274],
  [13, 0.5792],
  [14, 0.2523],
  [15, 0.0968],
  [16, 0.0484],
  [17, 0.0206],
  [18, 0.0032],
  [19, 0.0016],
  [20, 0.0008],
];

/**
 * Text-mode mapping from phoneme length to syllable-count weights.
 *
 * Also derived from a 300k deterministic sample of pre-top-down text mode.
 */
export const PHONEME_TO_SYLLABLE_WEIGHTS_TEXT: Record<number, [number, number][]> = {
  1: [[1, 100.00]],
  2: [[1, 100.00]],
  3: [[1, 98.97], [2, 1.03]],
  4: [[1, 88.09], [2, 11.91]],
  5: [[1, 45.10], [2, 53.43], [3, 1.47]],
  6: [[1, 4.41], [2, 70.16], [3, 25.42]],
  7: [[1, 0.21], [2, 25.23], [3, 72.48], [4, 2.08]],
  8: [[1, 0.01], [2, 6.12], [3, 74.96], [4, 18.91]],
  9: [[2, 1.18], [3, 42.01], [4, 55.67], [5, 1.13]],
  10: [[2, 0.11], [3, 15.67], [4, 74.26], [5, 9.96]],
  11: [[3, 3.72], [4, 62.96], [5, 33.16], [6, 0.16]],
  12: [[3, 0.55], [4, 40.41], [5, 57.00], [6, 2.04]],
  13: [[4, 18.73], [5, 70.14], [6, 11.13]],
  14: [[4, 7.83], [5, 54.35], [6, 37.83]],
  15: [[4, 0.91], [5, 36.36], [6, 62.73]],
  16: [[5, 7.69], [6, 92.31]],
  17: [[6, 100.00]],
  18: [[6, 100.00]],
  19: [[6, 100.00]],
  20: [[6, 100.00]],
};

/**
 * Lexicon-mode mapping from phoneme length to syllable-count weights.
 *
 * Derived from CMU Pronouncing Dictionary (`cmudict.dict`), excluding
 * alternate pronunciations (word(2), word(3), ...), total 126,044 entries.
 */
export const PHONEME_TO_SYLLABLE_WEIGHTS_LEXICON: Record<number, [number, number][]> = {
  1: [[1, 100.00]],
  2: [[1, 98.07], [2, 1.93]],
  3: [[1, 86.56], [2, 13.37], [3, 0.08]],
  4: [[1, 42.27], [2, 56.60], [3, 1.13]],
  5: [[1, 10.78], [2, 80.90], [3, 8.29], [4, 0.03]],
  6: [[1, 1.47], [2, 68.24], [3, 29.56], [4, 0.73]],
  7: [[1, 0.07], [2, 40.05], [3, 53.88], [4, 5.97], [5, 0.03]],
  8: [[1, 0.01], [2, 16.53], [3, 61.23], [4, 21.68], [5, 0.56]],
  9: [[2, 5.41], [3, 48.41], [4, 42.51], [5, 3.66], [6, 0.01]],
  10: [[2, 1.07], [3, 25.07], [4, 56.82], [5, 16.67], [6, 0.36]],
  11: [[2, 0.11], [3, 11.12], [4, 46.39], [5, 39.24], [6, 3.10], [7, 0.04]],
  12: [[3, 2.67], [4, 30.33], [5, 53.62], [6, 13.16], [7, 0.21]],
  13: [[3, 0.55], [4, 14.25], [5, 53.15], [6, 30.27], [7, 1.78]],
  14: [[4, 6.29], [5, 40.57], [6, 44.34], [7, 8.49], [8, 0.31]],
  15: [[4, 0.82], [5, 14.75], [6, 56.56], [7, 24.59], [8, 3.28]],
  16: [[5, 9.84], [6, 39.34], [7, 47.54], [8, 3.28]],
  17: [[5, 3.85], [6, 23.08], [7, 57.69], [8, 15.38]],
  18: [[7, 25.00], [8, 75.00]],
  19: [[8, 50.00], [9, 50.00]],
  20: [[9, 100.00]],
};

// ---------------------------------------------------------------------------
// Letter-length targets per syllable count
// ---------------------------------------------------------------------------

/**
 * Target letter-length ranges per syllable count: [min, peak_min, peak_max, max].
 * Used for rejection sampling to shape word-length distribution.
 */
export const LETTER_LENGTH_TARGETS: Record<number, [number, number, number, number]> = {
  1: [2, 3, 5, 7],
  2: [3, 5, 7, 10],
  3: [5, 7, 10, 13],
  4: [7, 8, 12, 15],
  5: [9, 10, 13, 16],
};

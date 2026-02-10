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
// Syllable count distribution
// ---------------------------------------------------------------------------
/** Weights for how many syllables a word should have (1–7). */
export const SYLLABLE_COUNT_WEIGHTS = [
    [1, 5000],
    [2, 30000],
    [3, 29700],
    [4, 3000],
    [5, 200],
    [6, 50],
    [7, 5],
];
// ---------------------------------------------------------------------------
// Onset length weights
// ---------------------------------------------------------------------------
/** Onset length weights for monosyllabic words. */
export const ONSET_LENGTH_MONOSYLLABIC = [
    [0, 50],
    [1, 100],
    [2, 200],
    [3, 150],
];
/** Onset length weights for polysyllabic words (following a nucleus with no coda). */
export const ONSET_LENGTH_FOLLOWING_NUCLEUS = [
    [0, 0],
    [1, 675],
    [2, 125],
    [3, 80],
];
/** Onset length weights for polysyllabic words (default). */
export const ONSET_LENGTH_DEFAULT = [
    [0, 150],
    [1, 675],
    [2, 125],
    [3, 80],
];
// ---------------------------------------------------------------------------
// Coda length weights
// ---------------------------------------------------------------------------
/** Coda length weights for monosyllabic words, keyed by onset length. */
export const CODA_LENGTH_MONOSYLLABIC = {
    0: [[0, 20], [1, 100], [2, 200], [3, 150]],
    1: [[0, 80], [1, 150], [2, 150], [3, 100]],
    2: [[0, 50], [1, 200], [2, 100], [3, 50]],
    3: [[0, 100], [1, 300], [2, 50], [3, 20]],
};
/** Coda length weights for monosyllabic words with onset length >= 4 (fallback). */
export const CODA_LENGTH_MONOSYLLABIC_DEFAULT = [
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
export const CODA_LENGTH_POLYSYLLABIC_NONZERO = [
    [1, 3000],
    [2, 900],
    [3, 100],
];
// ---------------------------------------------------------------------------
// Final 's' suffix probability
// ---------------------------------------------------------------------------
/** Chance (out of 100) to append a final 's' phoneme at end of word. */
export const FINAL_S_CHANCE = 15;
// ---------------------------------------------------------------------------
// Syllable boundary adjustment
// ---------------------------------------------------------------------------
/** Chance (out of 100) to drop a coda phoneme when sonority equals the following onset. */
export const BOUNDARY_DROP_CHANCE = 90;
// ---------------------------------------------------------------------------
// Onset / coda presence probabilities
// ---------------------------------------------------------------------------
/** Chance (out of 100) that the first syllable has an onset. */
export const HAS_ONSET_START_OF_WORD = 95;
/** Chance (out of 100) that a non-initial syllable has an onset when the previous syllable has a coda. */
export const HAS_ONSET_AFTER_CODA = 80;
/** Chance (out of 100) that a monosyllabic word has a coda. */
export const HAS_CODA_MONOSYLLABIC = 80;
/** Chance (out of 100) that the final syllable of a polysyllabic word has a coda. */
export const HAS_CODA_END_OF_WORD = 90;
/** Chance (out of 100) that a non-final syllable of a polysyllabic word has a coda. */
export const HAS_CODA_MID_WORD = 30;

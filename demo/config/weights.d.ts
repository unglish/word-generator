/**
 * Configuration constants for word generation weights and probabilities.
 *
 * These were previously inline magic numbers in generate.ts.
 * Each constant documents what it controls so future tuning is straightforward.
 */
/** Sonority bonus applied to voiced phonemes. */
export declare const VOICED_BONUS = 0.5;
/** Sonority bonus applied to tense phonemes. */
export declare const TENSE_BONUS = 0.25;
/** Weights for how many syllables a word should have (1–7). */
export declare const SYLLABLE_COUNT_WEIGHTS: [number, number][];
/** Onset length weights for monosyllabic words. */
export declare const ONSET_LENGTH_MONOSYLLABIC: [number, number][];
/** Onset length weights for polysyllabic words (following a nucleus with no coda). */
export declare const ONSET_LENGTH_FOLLOWING_NUCLEUS: [number, number][];
/** Onset length weights for polysyllabic words (default). */
export declare const ONSET_LENGTH_DEFAULT: [number, number][];
/** Coda length weights for monosyllabic words, keyed by onset length. */
export declare const CODA_LENGTH_MONOSYLLABIC: Record<number, [number, number][]>;
/** Coda length weights for monosyllabic words with onset length >= 4 (fallback). */
export declare const CODA_LENGTH_MONOSYLLABIC_DEFAULT: [number, number][];
/** Coda length weight for the zero-length option in polysyllabic words (end of word). */
export declare const CODA_ZERO_WEIGHT_END_OF_WORD = 1200;
/** Coda length weight for the zero-length option in polysyllabic words (mid word). */
export declare const CODA_ZERO_WEIGHT_MID_WORD = 6000;
/** Coda length weights for polysyllabic words (non-zero lengths). */
export declare const CODA_LENGTH_POLYSYLLABIC_NONZERO: [number, number][];
/** Chance (out of 100) to append a final 's' phoneme at end of word. */
export declare const FINAL_S_CHANCE = 15;
/** Chance (out of 100) to drop a coda phoneme when sonority equals the following onset. */
export declare const BOUNDARY_DROP_CHANCE = 90;
/** Chance (out of 100) that the first syllable has an onset. */
export declare const HAS_ONSET_START_OF_WORD = 95;
/** Chance (out of 100) that a non-initial syllable has an onset when the previous syllable has a coda. */
export declare const HAS_ONSET_AFTER_CODA = 80;
/** Chance (out of 100) that a monosyllabic word has a coda. */
export declare const HAS_CODA_MONOSYLLABIC = 80;
/** Chance (out of 100) that the final syllable of a polysyllabic word has a coda. */
export declare const HAS_CODA_END_OF_WORD = 90;
/** Chance (out of 100) that a non-final syllable of a polysyllabic word has a coda. */
export declare const HAS_CODA_MID_WORD = 30;
//# sourceMappingURL=weights.d.ts.map
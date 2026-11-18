/**
 * Pure helpers for top-down syllable / phoneme-length sampling.
 *
 * These encode the intended proposal distribution: syllable counts for a given
 * phone count come from {@link phonemeToSyllableWeights} with no letter-peak
 * (or other) reweighting. Forced-syllable phoneme draws use Bayes via
 * P(syllables | phonemes) only.
 */

/** Share of a phoneme count's syllable-count weights that falls on `syllableCount`. */
export function syllableShare(
  row: [number, number][] | undefined,
  syllableCount: number,
): number {
  if (!row?.length) return 0;
  const total = row.reduce((sum, [, weight]) => sum + weight, 0);
  return total > 0
    ? (row.find(([count]) => count === syllableCount)?.[1] ?? 0) / total
    : 0;
}

/**
 * Syllable-count sampling weights for a target phoneme count.
 * Returns the config table row unchanged — no letter-length peak reweighting.
 */
export function syllableCountSamplingWeights(
  phonemeToSyllableTable: Record<number, [number, number][]>,
  phonemeCount: number,
): [number, number][] {
  const weights = phonemeToSyllableTable[phonemeCount];
  if (!weights?.length) {
    throw new Error(
      `Missing phonemeToSyllableWeights entry for phoneme count ${phonemeCount}`,
    );
  }
  return weights;
}

/**
 * Normalise weight pairs to probabilities that sum to 1.
 */
export function normalizeWeightPairs(
  weights: readonly [number, number][],
): Map<number, number> {
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  if (total <= 0) {
    throw new Error("weight total must be positive");
  }
  return new Map(weights.map(([value, weight]) => [value, weight / total]));
}

/**
 * P(phonemes | forced syllables) ∝ P(phonemes) · P(syllables | phonemes).
 * No letter-peak reweighting. Falls back to feasible phoneme lengths, then all.
 */
export function phonemeLengthWeightsForForcedSyllables(
  phonemeLengthWeights: readonly [number, number][],
  phonemeToSyllableTable: Record<number, [number, number][]>,
  forcedSyllableCount: number,
  maxPhonemes: number,
): [number, number][] {
  const filtered = phonemeLengthWeights.filter(
    ([phonemeCount]) =>
      phonemeCount >= forcedSyllableCount && phonemeCount <= maxPhonemes,
  );
  const conditioned = filtered
    .map(([phonemeCount, weight]): [number, number] => [
      phonemeCount,
      weight *
        syllableShare(phonemeToSyllableTable[phonemeCount], forcedSyllableCount),
    ])
    .filter(([, weight]) => weight > 0);
  if (conditioned.length > 0) return conditioned;
  if (filtered.length > 0) return [...filtered];
  return [...phonemeLengthWeights];
}

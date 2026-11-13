export interface PhonemeTargetBounds {
  minRoot: number;
  maxRoot: number;
}

export interface AttemptScore {
  phonemeDistance: number;
  letterPenalty: number;
  total: number;
}

export interface AcceptanceCriteria {
  /** Attempts before near-target letter lengths can be accepted. */
  warmupAttempts: number;
  /** Largest letter penalty accepted after the warmup. */
  relaxedLetterPenalty: number;
}

export interface AttemptAssessment {
  /** null means the attempt was rejected. */
  acceptedBy: "exact" | "relaxed" | null;
  /** Conditions that rejected the attempt; several can fail at once. */
  failed: { phonemeTarget: boolean; letterLength: boolean; warmup: boolean };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

export function computePhonemeTargetBounds(
  forcedRootSyllableCount: number | undefined,
  maxOnsetLength: number,
  maxCodaLength: number,
): PhonemeTargetBounds {
  const minRoot = forcedRootSyllableCount ?? 1;
  const maxRoot = forcedRootSyllableCount
    ? forcedRootSyllableCount + forcedRootSyllableCount * (maxOnsetLength + maxCodaLength) + 1
    : Infinity;
  return { minRoot, maxRoot };
}

/** The sampled target belongs to the root; affix costs do not enter it. */
export function resolveRootPhonemeTarget(sampledRootTarget: number, bounds: PhonemeTargetBounds): number {
  return clamp(sampledRootTarget, bounds.minRoot, bounds.maxRoot);
}

export function resolveLetterLengthBounds(
  targets: Record<number, [number, number, number, number]> | undefined,
  syllableCount: number,
): [number, number, number, number] | null {
  if (!targets) return null;
  if (targets[syllableCount]) return targets[syllableCount];
  const keys = Object.keys(targets).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (keys.length === 0) return null;
  if (syllableCount <= keys[0]) return targets[keys[0]];
  if (syllableCount >= keys[keys.length - 1]) return targets[keys[keys.length - 1]];
  let nearest = keys[0];
  let nearestDist = Math.abs(syllableCount - nearest);
  for (const key of keys.slice(1)) {
    const dist = Math.abs(syllableCount - key);
    if (dist < nearestDist) {
      nearest = key;
      nearestDist = dist;
    }
  }
  return targets[nearest];
}

export function scoreLetterLength(
  letterLength: number,
  syllableCount: number,
  targets: Record<number, [number, number, number, number]> | undefined,
): number {
  const bounds = resolveLetterLengthBounds(targets, syllableCount);
  if (!bounds) return 0;
  const [min, peakMin, peakMax, max] = bounds;
  if (letterLength >= peakMin && letterLength <= peakMax) return 0;
  if (letterLength >= min && letterLength <= max) {
    const edgeDistance = letterLength < peakMin ? peakMin - letterLength : letterLength - peakMax;
    return edgeDistance * 0.5;
  }
  const outsideDistance = letterLength < min ? min - letterLength : letterLength - max;
  return 1 + outsideDistance;
}

/**
 * Typical written letters per root phoneme on English peak hits (~1.19 measured).
 * Used only to bias proposal weights toward letter-compatible (syllables, phonemes)
 * pairs before spelling; acceptance still scores the real written length.
 */
export const EXPECTED_LETTERS_PER_PHONEME = 1.15;

/** Extra weight for (phonemes, syllables) pairs whose expected letters land in the peak. */
export const LETTER_PEAK_WEIGHT_BOOST = 2;

/**
 * Multiplier for sampling weights that prefer phoneme/syllable pairs likely to
 * hit {@link scoreLetterLength}'s peak under a fixed letters-per-phoneme prior.
 * Returns 1 when letter targets are absent (no bias).
 */
export function letterPeakSamplingWeight(
  phonemes: number,
  syllables: number,
  targets: Record<number, [number, number, number, number]> | undefined,
  lettersPerPhoneme: number = EXPECTED_LETTERS_PER_PHONEME,
  inPeakBoost: number = LETTER_PEAK_WEIGHT_BOOST,
): number {
  const bounds = resolveLetterLengthBounds(targets, syllables);
  if (!bounds) return 1;
  const [, peakMin, peakMax] = bounds;
  const expected = phonemes * lettersPerPhoneme;
  if (expected >= peakMin && expected <= peakMax) return inPeakBoost;
  const distance = expected < peakMin ? peakMin - expected : expected - peakMax;
  return 1 / (1 + distance);
}

/** The phoneme part of an attempt's score; letter penalties only add to it. */
function phonemeScore(phonemeDistance: number): number {
  return phonemeDistance * 2;
}

export function scoreGenerationAttempt(
  generatedPhonemes: number,
  targetPhonemes: number,
  generatedLetters: number,
  generatedSyllables: number,
  letterTargets: Record<number, [number, number, number, number]> | undefined,
): AttemptScore {
  const phonemeDistance = Math.abs(generatedPhonemes - targetPhonemes);
  const letterPenalty = scoreLetterLength(generatedLetters, generatedSyllables, letterTargets);
  return {
    phonemeDistance,
    letterPenalty,
    total: phonemeScore(phonemeDistance) + letterPenalty,
  };
}

/**
 * True when an attempt's outcome is already decided by its phoneme count: it
 * misses the target, so no acceptance criterion can pass, and its total score
 * cannot fall below the best attempt so far, so it cannot become the fallback.
 * Such an attempt need not be spelled.
 */
export function isDecidedRejection(phonemeDistance: number, bestScore: number): boolean {
  return phonemeDistance > 0 && phonemeScore(phonemeDistance) >= bestScore;
}

/**
 * Decide whether an attempt is accepted. An exact match is always accepted;
 * after the warmup, a matching phoneme count with a small letter penalty is too.
 */
export function assessAttempt(
  score: AttemptScore,
  attemptIndex: number,
  criteria: AcceptanceCriteria,
): AttemptAssessment {
  // Preserve the original positive acceptance checks: NaN must not be accepted
  // merely because it fails neither a greater-than nor a warmup comparison.
  const exact = score.phonemeDistance === 0 && score.letterPenalty === 0;
  const relaxed = attemptIndex >= criteria.warmupAttempts
    && score.phonemeDistance === 0 && score.letterPenalty <= criteria.relaxedLetterPenalty;
  const failed = {
    phonemeTarget: score.phonemeDistance !== 0,
    letterLength: !(score.letterPenalty <= criteria.relaxedLetterPenalty),
    warmup: attemptIndex < criteria.warmupAttempts && score.letterPenalty !== 0,
  };
  return { acceptedBy: exact ? "exact" : relaxed ? "relaxed" : null, failed };
}

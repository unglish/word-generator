import type { MorphologyPlan } from "./morphology/index.js";

export interface MorphologyPhonemeDelta {
  planned: number;
  resolved?: number;
  drift?: number;
}

export interface PhonemeTargetBounds {
  minRoot: number;
  maxRoot: number;
}

export interface DerivedPhonemeTargets {
  finalTarget: number;
  rootTarget: number;
  bounds: PhonemeTargetBounds;
}

export interface AttemptScore {
  phonemeDistance: number;
  letterPenalty: number;
  total: number;
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

export function derivePhonemeTargets(
  sampledFinalTarget: number,
  plannedMorphologyDelta: number,
  bounds: PhonemeTargetBounds,
): DerivedPhonemeTargets {
  const minFinal = bounds.minRoot + plannedMorphologyDelta;
  const maxFinal = Number.isFinite(bounds.maxRoot) ? bounds.maxRoot + plannedMorphologyDelta : Infinity;
  const finalTarget = clamp(sampledFinalTarget, minFinal, maxFinal);
  const rootTarget = clamp(finalTarget - plannedMorphologyDelta, bounds.minRoot, bounds.maxRoot);
  return { finalTarget, rootTarget, bounds };
}

export function getPlannedMorphologyPhonemeDelta(plan?: MorphologyPlan): MorphologyPhonemeDelta {
  if (!plan) return { planned: 0 };
  const planned = (plan.prefix?.phonemes.length ?? 0) + (plan.suffix?.phonemes.length ?? 0);
  return { planned };
}

export function resolveMorphologyPhonemeDelta(
  rootPhonemeCount: number,
  finalPhonemeCount: number,
  planned?: MorphologyPhonemeDelta,
): MorphologyPhonemeDelta {
  const plannedDelta = planned?.planned ?? 0;
  const resolved = finalPhonemeCount - rootPhonemeCount;
  return {
    planned: plannedDelta,
    resolved,
    drift: resolved - plannedDelta,
  };
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
    total: phonemeDistance * 2 + letterPenalty,
  };
}

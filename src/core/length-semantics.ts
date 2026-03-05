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

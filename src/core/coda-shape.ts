import type { ClusterLimits, CodaConstraints } from "../config/language.js";
import type { Phoneme } from "../types.js";
import { isNasal, isObstruent, isStop } from "../utils/phonemes.js";

export function maximumCodaLength(lastSound: string, limits: ClusterLimits, appendants?: ReadonlySet<string>): number {
  return limits.maxCoda + (appendants?.has(lastSound) ? 1 : 0);
}

export function hasConflictingObstruentVoicing(left: Phoneme, right: Phoneme): boolean {
  return isObstruent(left) && isObstruent(right) && left.voiced !== right.voiced;
}

export function isHeterorganicNasalStop(left: Phoneme, right: Phoneme): boolean {
  return isNasal(left) && isStop(right) && left.placeOfArticulation !== right.placeOfArticulation;
}

export function codaShapeRejection(
  coda: Phoneme[],
  candidate: Phoneme,
  limits?: ClusterLimits,
  appendants?: ReadonlySet<string>,
  constraints?: CodaConstraints,
): "length" | "voicing" | "place" | undefined {
  if (limits && coda.length + 1 > maximumCodaLength(candidate.sound, limits, appendants)) return "length";
  if (constraints?.voicingAgreement && coda.some(phoneme => hasConflictingObstruentVoicing(phoneme, candidate))) return "voicing";
  const previous = coda[coda.length - 1];
  if (constraints?.homorganicNasalStop && previous && isHeterorganicNasalStop(previous, candidate)) return "place";
  return undefined;
}

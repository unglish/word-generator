import { getPhonemePositionWeight, type ClusterContext, type Phoneme } from "../types.js";
import type { ClusterLimits, LanguageConfig } from "../config/language.js";
import { codaShapeRejection } from "./coda-shape.js";
import type { CodaExtensionRejectionReason } from "./trace.js";

export interface ClusterValidationRuntime {
  config: Pick<LanguageConfig, "codaConstraints">;
  sonorityLevels: Map<Phoneme, number>;
  invalidClusterRegexes: Record<"onset" | "coda" | "nucleus", RegExp | null>;
  clusterLimits?: ClusterLimits;
  codaAppendantSet?: Set<string>;
  bannedCodaSet?: Set<string>;
  bannedNucleusCodaMap?: Map<string, Set<string>>;
  attestedOnsetSet?: Set<string>;
  attestedOnsetPrefixSet?: Set<string>;
  attestedCodaSet?: Set<string>;
  attestedCodaPrefixSet?: Set<string>;
  clusterWeights?: {
    onset?: Map<string, number>;
    coda?: Map<string, number> | { final?: Map<string, number>; nonFinal?: Map<string, number> };
  };
}

function getSonority(rt: ClusterValidationRuntime, phoneme: Phoneme): number {
  return rt.sonorityLevels.get(phoneme) ?? 0;
}

export function getClusterWeightMap(
  weightsForPosition: Map<string, number> | { final?: Map<string, number>; nonFinal?: Map<string, number> } | undefined,
  isEndOfWord: boolean
): Map<string, number> | undefined {
  if (!weightsForPosition) return undefined;
  if (typeof weightsForPosition === "object" && "final" in weightsForPosition) {
    return isEndOfWord ? weightsForPosition.final : weightsForPosition.nonFinal;
  }
  return weightsForPosition as Map<string, number>;
}

/** Sentinel: no cluster weight found. */
export const NO_CLUSTER_WEIGHT = -1;

/**
 * Find the cluster weight multiplier for a candidate phoneme sound.
 * Returns the weight (>= 0) or NO_CLUSTER_WEIGHT (-1) if no weight applies.
 */
export function findClusterWeightMultiplier(
  clusterSounds: string[],
  candidateSound: string,
  weightMap: Map<string, number> | undefined
): number {
  if (!weightMap) return NO_CLUSTER_WEIGHT;

  // Build suffix keys without allocating arrays.
  // For clusterSounds=[a,b] and candidate=c, check: "a,b,c", "b,c", "c"
  const len = clusterSounds.length;
  for (let i = 0; i <= len; i++) {
    let suffix = "";
    for (let j = i; j < len; j++) {
      if (suffix) suffix += ",";
      suffix += clusterSounds[j];
    }
    if (suffix) suffix += ",";
    suffix += candidateSound;
    const weight = weightMap.get(suffix);
    if (weight !== undefined) return weight;
  }
  return NO_CLUSTER_WEIGHT;
}

export function clusterCandidateRejection(p: Phoneme, rt: ClusterValidationRuntime, context: ClusterContext): CodaExtensionRejectionReason | undefined {
  const sound = p.sound;
  const { clusterSounds } = context;

  if (context.ignoreSet.has(sound)) return "excluded";
  if (clusterSounds[clusterSounds.length - 1] === sound) return "repetition";
  // Attested coda continuations may repeat a non-adjacent segment (e.g. /sts/).
  if (clusterSounds.includes(sound) && !(context.position === "coda" && rt.attestedCodaSet)) return "repetition";
  if (!isValidPosition(p, context)) return "position";
  if (context.position === "coda") {
    const shapeReason = codaShapeRejection(context.cluster, p, rt.clusterLimits, rt.codaAppendantSet, rt.config.codaConstraints);
    if (shapeReason) return shapeReason;
  }

  // Reject phonemes banned from coda position entirely
  if (context.position === "coda" && rt.bannedCodaSet?.has(sound)) {
    return "banned-coda";
  }

  // Reject coda phonemes banned after the current nucleus
  if (context.position === "coda" && context.nucleus && rt.bannedNucleusCodaMap) {
    for (const nuc of context.nucleus) {
      const bannedCodas = rt.bannedNucleusCodaMap.get(nuc.sound);
      if (bannedCodas?.has(sound)) {
        return "nucleus-coda";
      }
    }
  }

  // Check cluster weight threshold: reject if weight multiplier is below 0.01 (1%)
  if (clusterSounds.length > 0 && rt.clusterWeights) {
    const weightsForPosition = context.position === "onset" ? rt.clusterWeights.onset : rt.clusterWeights.coda;
    if (weightsForPosition) {
      const weightMap = getClusterWeightMap(weightsForPosition, context.isEndOfWord);
      const weight = findClusterWeightMultiplier(clusterSounds, sound, weightMap);
      if (weight !== NO_CLUSTER_WEIGHT && weight < 0.01) {
        return "cluster-weight";
      }
    }
  }

  // When attested onset whitelist exists, use it as the primary gate for onsets
  if (context.position === "onset" && rt.attestedOnsetSet && clusterSounds.length > 0) {
    const key = clusterSounds.join("|") + "|" + sound;
    return rt.attestedOnsetSet.has(key) || rt.attestedOnsetPrefixSet?.has(key) ? undefined : "attestation";
  }

  // When attested coda whitelist exists, use it as the primary gate for codas
  if (context.position === "coda" && rt.attestedCodaSet && clusterSounds.length > 0) {
    const key = clusterSounds.join("|") + "|" + sound;
    return rt.attestedCodaSet.has(key) || rt.attestedCodaPrefixSet?.has(key) ? undefined : "attestation";
  }

  // Fallback: standard sonority and regex checks
  if (!checkSonority(p, rt, context)) return "sonority";

  const regex = rt.invalidClusterRegexes[context.position];
  if (regex) {
    // Build potential cluster string without allocating array
    let potentialCluster = "";
    for (let i = 0; i < clusterSounds.length; i++) potentialCluster += clusterSounds[i];
    potentialCluster += sound;
    if (regex.test(potentialCluster)) return "pattern";
  }

  return undefined;
}

function isValidPosition(p: Phoneme, { position, isStartOfWord, isEndOfWord }: ClusterContext): boolean {
  const positionWeight = getPhonemePositionWeight(p, position);
  return (positionWeight === undefined || positionWeight > 0) &&
         (!isStartOfWord || p.startWord === undefined || p.startWord > 0) &&
         (!isEndOfWord || p.endWord === undefined || p.endWord > 0);
}

function checkSonority(p: Phoneme, rt: ClusterValidationRuntime, { cluster, position }: ClusterContext): boolean {
  const prevPhoneme = cluster[cluster.length - 1];

  switch (position) {
  case "onset":
    return checkOnsetSonority(p, rt, cluster, prevPhoneme);
  case "coda":
    return checkCodaSonority(p, rt, prevPhoneme);
  case "nucleus":
    return true;
  default:
    return false;
  }
}

function checkOnsetSonority(currPhoneme: Phoneme, rt: ClusterValidationRuntime, cluster: Phoneme[], prevPhoneme: Phoneme | undefined): boolean {
  if (cluster.length === 0) return true;

  const isSClusterException =
    cluster.length === 1 &&
    cluster[0].sound === "s" &&
    (currPhoneme.sound === "t" || currPhoneme.sound === "p" || currPhoneme.sound === "k");

  if (isSClusterException) return true;

  if (currPhoneme.placeOfArticulation === prevPhoneme?.placeOfArticulation) return false;

  const lastPhonemeWasAStop = prevPhoneme?.mannerOfArticulation === "stop";
  const canFollowAStop = lastPhonemeWasAStop ? (currPhoneme.mannerOfArticulation === "glide" || currPhoneme.mannerOfArticulation === "liquid") : false;

  return lastPhonemeWasAStop ? canFollowAStop : getSonority(rt, currPhoneme) > getSonority(rt, prevPhoneme!);
}

function checkCodaSonority(currPhoneme: Phoneme, rt: ClusterValidationRuntime, prevPhoneme: Phoneme | undefined): boolean {
  if (!prevPhoneme) return true;

  const prevSonority = getSonority(rt, prevPhoneme);
  const currSonority = getSonority(rt, currPhoneme);

  const prevManner = prevPhoneme.mannerOfArticulation;
  const currManner = currPhoneme.mannerOfArticulation;

  const isEqualSonorityException =
    (prevManner == "fricative" && currManner == "fricative") ||
    (prevManner == "stop" && currManner == "stop");

  const isReversedSonorityException =
    (prevManner == "stop" && currManner == "fricative") ||
    (prevManner == "stop" && currManner == "sibilant") ||
    (prevManner == "nasal" && currManner === "sibilant");

  return isEqualSonorityException || isReversedSonorityException || (currSonority < prevSonority);
}


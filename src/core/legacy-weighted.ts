import type { ClusterLimits, LanguageConfig } from "../config/language.js";
import { getPhonemePositionWeight, type ClusterContext, type GenerationMode, type Phoneme, type Syllable, type SyllableShapePlan } from "../types.js";
import getWeightedOption, { coinFlip } from "../utils/getWeightedOption.js";
import { isStop } from "../utils/phonemes.js";
import { codaShapeRejection } from "./coda-shape.js";
import { isCheckedOpenFinalAllowed, nucleusWordPositionWeight } from "./nucleus-position.js";
import type { NucleusRepairPolicy } from "./nucleus-repair.js";
import { excludedAfterOnset, isNucleusCodaPairAllowed } from "./rime-compatibility.js";
import { weightMatchingCoda } from "./root-repetition.js";
import { adjustBoundary, repairVowelHiatus } from "./segment-boundaries.js";
import type { SegmentEngine, SegmentSelectionInput } from "./segment-selection.js";
import type { RNG } from "../utils/random.js";
import { noDraws } from "./stage-streams.js";
import type { CodaExtensionRejectionReason } from "./trace.js";

/** Tables prepared once for this inventory. Repairs reuse the same phoneme objects and rime policy. */
export interface LegacySelectionRuntime {
  config: LanguageConfig;
  sonorityLevels: Map<Phoneme, number>;
  positionPhonemes: { onset: Phoneme[]; coda: Phoneme[]; nucleus: Phoneme[] };
  invalidClusterRegexes: {
    onset: RegExp | null;
    coda: RegExp | null;
    /** Maps to config.invalidClusters.boundary — keyed "nucleus" because
     *  ClusterContext.position uses "nucleus" as the catch-all third position. */
    nucleus: RegExp | null;
  };
  allowedFinalSet?: Set<string>;
  bannedCodaSet?: Set<string>;
  nucleusRepair: Pick<NucleusRepairPolicy, "rimes" | "forbidOpenCheckedFinal">;
  preservedCodaInitials?: ReadonlySet<string>;
  clusterLimits?: ClusterLimits;
  codaAppendantSet?: Set<string>;
  attestedOnsetSet?: Set<string>;
  attestedCodaSet?: Set<string>;
  attestedOnsetPrefixSet?: Set<string>;
  attestedCodaPrefixSet?: Set<string>;
  clusterWeights?: {
    onset?: Map<string, number>;
    boundary?: ReadonlyMap<string, ReadonlyMap<string, number>>;
    coda?:
      | Map<string, number>
      | {
          final?: Map<string, number>;
          nonFinal?: Map<string, number>;
        };
  };
  /** Pre-resolved bridge phoneme options for vowel hiatus repair. */
  bridgePhonemeOptions: [Phoneme, number][];
}

type FinalCodasByNucleus = Map<string, Map<number, [Phoneme[], number][]>>;
const DEFAULT_POST_VOWEL_GLIDE_MULTIPLIER = 0.08;

interface SelectionCursor extends Pick<SegmentSelectionInput, "rootRepetition" | "trace"> {
  rand: RNG;
  syllables: Syllable[];
  syllableCount: number;
  currSyllableIndex: number;
}

/** Shared empty set for ClusterContext.ignoreSet when no phonemes should be ignored. */
const _emptySet: ReadonlySet<string> = Object.freeze(new Set<string>());

/**
 * Last element, or undefined for an empty array. Avoids `arr[arr.length - 1]`
 * on empty arrays, which V8 resolves as a slow named-property lookup of "-1".
 */
function lastItem<T>(items: readonly T[]): T | undefined {
  return items.length > 0 ? items[items.length - 1] : undefined;
}

function getPostVowelGlideMultiplier(rt: LegacySelectionRuntime): number {
  return (
    rt.config.hiatusPolicy?.postVowelGlideMultiplier ??
    DEFAULT_POST_VOWEL_GLIDE_MULTIPLIER
  );
}

/** Build a set of all proper prefixes for attested clusters (excludes the full key). */
export function buildPrefixSet(clusters: string[][]): Set<string> {
  const set = new Set<string>();
  for (const parts of clusters) {
    for (let i = 1; i < parts.length; i++) {
      set.add(parts.slice(0, i).join("|"));
    }
  }
  return set;
}

// ---------------------------------------------------------------------------
// Sonority
// ---------------------------------------------------------------------------

function getSonority(rt: LegacySelectionRuntime, phoneme: Phoneme): number {
  return rt.sonorityLevels.get(phoneme) ?? 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClusterWeightMap(
  weightsForPosition:
    | Map<string, number>
    | { final?: Map<string, number>; nonFinal?: Map<string, number> }
    | undefined,
  isEndOfWord: boolean,
): Map<string, number> | undefined {
  if (!weightsForPosition) return undefined;
  if (typeof weightsForPosition === "object" && "final" in weightsForPosition) {
    return isEndOfWord ? weightsForPosition.final : weightsForPosition.nonFinal;
  }
  return weightsForPosition as Map<string, number>;
}

/** Sentinel: no cluster weight found. */
const NO_CLUSTER_WEIGHT = -1;

/**
 * Find the cluster weight multiplier for a candidate phoneme sound.
 * Returns the weight (>= 0) or NO_CLUSTER_WEIGHT (-1) if no weight applies.
 */
function findClusterWeightMultiplier(
  clusterSounds: string[],
  candidateSound: string,
  weightMap: Map<string, number> | undefined,
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

// ---------------------------------------------------------------------------
// Cluster building
// ---------------------------------------------------------------------------

export function buildCluster(
  rt: LegacySelectionRuntime,
  context: ClusterContext,
): Phoneme[] {
  const allPositionPhonemes = rt.positionPhonemes[context.position];
  // Reusable buffer for valid candidates — avoids allocating a new array each iteration.
  const validBuf: Phoneme[] = [];

  while (context.cluster.length < context.maxLength) {
    validBuf.length = 0;
    for (let i = 0; i < allPositionPhonemes.length; i++) {
      if (isOrdinaryClusterCandidate(allPositionPhonemes[i], rt, context)) {
        validBuf.push(allPositionPhonemes[i]);
      }
    }
    if (validBuf.length === 0) break;

    const newPhoneme = selectPhoneme(validBuf, context, rt);
    if (!newPhoneme) break;

    context.cluster.push(newPhoneme);
    context.clusterSounds.push(newPhoneme.sound);
    if (shouldStopClusterGrowth(context, rt)) break;
  }

  return context.cluster;
}

export function isOrdinaryClusterCandidate(
  p: Phoneme,
  rt: LegacySelectionRuntime,
  context: ClusterContext,
): boolean {
  return clusterCandidateRejection(p, rt, context) === undefined;
}

function clusterCandidateRejection(
  p: Phoneme,
  rt: LegacySelectionRuntime,
  context: ClusterContext,
  check: "ordinary" | "extension" | "audited" = "ordinary",
): CodaExtensionRejectionReason | undefined {
  const sound = p.sound;
  const { clusterSounds } = context;

  if (context.ignoreSet.has(sound)) return "excluded";
  if (lastItem(clusterSounds) === sound) return "repetition";
  // Optional extensions may repeat a separated segment when attested (e.g. /ksts/).
  if (
    clusterSounds.includes(sound) &&
    !(check === "extension" && context.position === "coda" && rt.attestedCodaSet)
  )
    return "repetition";
  if (!isValidPosition(p, context)) return "position";
  if (check !== "ordinary") {
    const shapeReason = codaShapeRejection(
      context.cluster,
      p,
      rt.clusterLimits,
      rt.codaAppendantSet,
      rt.config.codaConstraints,
    );
    if (shapeReason) return shapeReason;
  }

  if (context.position === "coda" && rt.bannedCodaSet?.has(sound)) {
    return "banned-coda";
  }

  if (context.excludedAfterOnset?.has(sound)) return "onset-rime";

  if (
    context.position === "onset" &&
    clusterSounds.length === 0 &&
    context.bannedFirstOnset?.has(sound)
  ) {
    return "nucleus-onset";
  }

  if (
    context.position === "coda" &&
    context.nucleus &&
    rt.nucleusRepair.rimes.nucleusCoda
  ) {
    for (const nuc of context.nucleus) {
      if (
        !isNucleusCodaPairAllowed(nuc.sound, sound, rt.nucleusRepair.rimes.nucleusCoda)
      ) {
        return "nucleus-coda";
      }
    }
  }

  if (clusterSounds.length > 0 && rt.clusterWeights) {
    const weightsForPosition =
      context.position === "onset"
        ? rt.clusterWeights.onset
        : rt.clusterWeights.coda;
    if (weightsForPosition) {
      const weightMap = getClusterWeightMap(
        weightsForPosition,
        context.isEndOfWord,
      );
      const weight = findClusterWeightMultiplier(
        clusterSounds,
        sound,
        weightMap,
      );
      if (weight !== NO_CLUSTER_WEIGHT && weight < 0.01) {
        return "cluster-weight";
      }
    }
  }

  if (
    context.position === "onset" &&
    rt.attestedOnsetSet &&
    clusterSounds.length > 0
  ) {
    const key = clusterSounds.join("|") + "|" + sound;
    return rt.attestedOnsetSet.has(key) || rt.attestedOnsetPrefixSet?.has(key)
      ? undefined
      : "attestation";
  }

  if (
    context.position === "coda" &&
    rt.attestedCodaSet &&
    clusterSounds.length > 0
  ) {
    const key = clusterSounds.join("|") + "|" + sound;
    if (!rt.attestedCodaSet.has(key) && !rt.attestedCodaPrefixSet?.has(key)) return "attestation";
    if (check !== "audited") return undefined;
  }

  if (!checkSonority(p, rt, context)) return "sonority";

  const regex = rt.invalidClusterRegexes[context.position];
  if (regex) {
    // Avoid allocating a temporary array for each candidate in this hot path.
    let potentialCluster = "";
    for (let i = 0; i < clusterSounds.length; i++)
      potentialCluster += clusterSounds[i];
    potentialCluster += sound;
    if (regex.test(potentialCluster)) return "pattern";
  }

  return undefined;
}

function isValidPosition(
  p: Phoneme,
  context: ClusterContext,
): boolean {
  const { position, isStartOfWord, isEndOfWord, nucleusWordEdges } = context;
  const positionWeight = getPhonemePositionWeight(p, position);
  if (position === "nucleus" && nucleusWordEdges) {
    if (
      context.forbidOpenCheckedFinal &&
      !isCheckedOpenFinalAllowed(p, nucleusWordEdges)
    ) {
      return false;
    }
    if (p.nucleusWordPosition) {
      return (
        (positionWeight === undefined || positionWeight > 0) &&
        nucleusWordPositionWeight(p, nucleusWordEdges)! > 0
      );
    }
  }
  return (
    (positionWeight === undefined || positionWeight > 0) &&
    (!isStartOfWord || p.startWord === undefined || p.startWord > 0) &&
    (!isEndOfWord || p.endWord === undefined || p.endWord > 0)
  );
}

export function isValidCluster(
  rt: LegacySelectionRuntime,
  cluster: Phoneme[],
  position: "onset" | "coda" | "nucleus",
): boolean {
  const regex = rt.invalidClusterRegexes[position];
  if (!regex) return true;
  let potentialCluster = "";
  for (let i = 0; i < cluster.length; i++) potentialCluster += cluster[i].sound;
  return !regex.test(potentialCluster);
}

// ---------------------------------------------------------------------------
// Sonority checks
// ---------------------------------------------------------------------------

function checkSonority(
  p: Phoneme,
  rt: LegacySelectionRuntime,
  { cluster, position }: ClusterContext,
): boolean {
  const prevPhoneme = lastItem(cluster);

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

function checkOnsetSonority(
  currPhoneme: Phoneme,
  rt: LegacySelectionRuntime,
  cluster: Phoneme[],
  prevPhoneme: Phoneme | undefined,
): boolean {
  if (cluster.length === 0) return true;

  const isSClusterException =
    cluster.length === 1 &&
    cluster[0].sound === "s" &&
    (currPhoneme.sound === "t" ||
      currPhoneme.sound === "p" ||
      currPhoneme.sound === "k");

  if (isSClusterException) return true;

  if (currPhoneme.placeOfArticulation === prevPhoneme?.placeOfArticulation)
    return false;

  const lastPhonemeWasAStop = prevPhoneme?.mannerOfArticulation === "stop";
  const canFollowAStop = lastPhonemeWasAStop
    ? currPhoneme.mannerOfArticulation === "glide" ||
      currPhoneme.mannerOfArticulation === "liquid"
    : false;

  return lastPhonemeWasAStop
    ? canFollowAStop
    : getSonority(rt, currPhoneme) > getSonority(rt, prevPhoneme!);
}

function checkCodaSonority(
  currPhoneme: Phoneme,
  rt: LegacySelectionRuntime,
  prevPhoneme: Phoneme | undefined,
): boolean {
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

  return (
    isEqualSonorityException ||
    isReversedSonorityException ||
    currSonority < prevSonority
  );
}

// ---------------------------------------------------------------------------
// Phoneme selection
// ---------------------------------------------------------------------------

function selectPhoneme(
  validCandidates: Phoneme[],
  context: ClusterContext,
  rt?: LegacySelectionRuntime,
): Phoneme | null {
  const { position, isStartOfWord, isEndOfWord, rand, clusterSounds } = context;
  const isMedialCoda = position === "coda" && !isEndOfWord;
  const firstOnsetWeights = clusterSounds.length === 0 ? context.firstOnsetWeights : undefined;
  const repetition = clusterSounds.length === 0 ? context.repetitionPenalty : undefined;
  const repeatedNucleus = position === "nucleus" ? repetition : undefined;

  let weightMap: Map<string, number> | undefined;
  if (
    rt &&
    (clusterSounds.length > 0 || context.maxLength >= 2) &&
    rt.clusterWeights
  ) {
    const weightsForPosition =
      position === "onset" ? rt.clusterWeights.onset : rt.clusterWeights.coda;
    if (weightsForPosition) {
      weightMap = getClusterWeightMap(weightsForPosition, isEndOfWord);
    }
  }

  const applyGlide =
    position === "onset" &&
    context.followingOpenNucleus &&
    clusterSounds.length === 0;
  const glideMultiplier = applyGlide
    ? rt
      ? getPostVowelGlideMultiplier(rt)
      : DEFAULT_POST_VOWEL_GLIDE_MULTIPLIER
    : 1;

  const weightedCandidates: [Phoneme, number][] = new Array(
    validCandidates.length,
  );
  for (let i = 0; i < validCandidates.length; i++) {
    const p = validCandidates[i];
    const positionWeight = p[position] ?? 0;
    const explicitNucleusWeight =
      position === "nucleus" && context.nucleusWordEdges
        ? nucleusWordPositionWeight(p, context.nucleusWordEdges)
        : undefined;
    const wordPositionModifier =
      explicitNucleusWeight ??
      ((isStartOfWord && p.startWord) ||
        (isEndOfWord && p.endWord) ||
        p.midWord ||
        1);

    let baseWeight = positionWeight * wordPositionModifier;
    if (isMedialCoda) baseWeight *= p.medialCodaMultiplier ?? 1;
    if (firstOnsetWeights) baseWeight *= firstOnsetWeights.get(p.sound) ?? 1;

    if (weightMap) {
      const multiplier = findClusterWeightMultiplier(
        clusterSounds,
        p.sound,
        weightMap,
      );
      if (multiplier !== NO_CLUSTER_WEIGHT) {
        baseWeight *= multiplier;
      }
    }

    if (applyGlide && (p.sound === "j" || p.sound === "w")) {
      baseWeight *= glideMultiplier;
    }

    if (p.sound === repeatedNucleus?.sound) {
      baseWeight *= repeatedNucleus.multiplier;
    }

    weightedCandidates[i] = [p, baseWeight];
  }

  const options = position === "coda" && repetition
    ? weightMatchingCoda(weightedCandidates, (phoneme) => phoneme.sound, repetition, rt?.preservedCodaInitials)
    : weightedCandidates;
  return getWeightedOption(options, rand);
}

function shouldStopClusterGrowth(
  context: ClusterContext,
  rt: LegacySelectionRuntime,
): boolean {
  const { position, cluster } = context;

  if (rt.clusterLimits) {
    const cl = rt.clusterLimits;
    if (position === "onset" && cluster.length >= cl.maxOnset) return true;
    if (position === "coda") {
      const effectiveMax =
        rt.codaAppendantSet &&
        cluster.length > 0 &&
        rt.codaAppendantSet.has(cluster[cluster.length - 1].sound)
          ? cl.maxCoda + 1
          : cl.maxCoda;
      if (cluster.length >= effectiveMax) return true;
    }
  }

  if (position === "onset" && rt.attestedOnsetSet && cluster.length >= 2) {
    const key = context.clusterSounds.join("|");
    if (rt.attestedOnsetSet.has(key)) {
      const hasLonger = rt.attestedOnsetPrefixSet?.has(key) ?? false;
      if (!hasLonger) return true;
    }
  }

  if (position === "coda" && rt.attestedCodaSet && cluster.length >= 2) {
    const key = context.clusterSounds.join("|");
    if (rt.attestedCodaSet.has(key)) {
      const hasLonger = rt.attestedCodaPrefixSet?.has(key) ?? false;
      if (!hasLonger) return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Syllable picking
// ---------------------------------------------------------------------------

function pickOnset(
  rt: LegacySelectionRuntime,
  context: SelectionCursor,
  isStartOfWord: boolean,
  monosyllabic: boolean,
  targetLength?: number,
): Phoneme[] {
  const prevSyllable = context.syllables[context.currSyllableIndex - 1];
  const isFollowingNucleus = prevSyllable && prevSyllable.coda.length === 0;
  const syllableCount = context.syllableCount;
  const { onsetLength } = rt.config.generationWeights;

  const rand = context.rand;
  const polysyllabicWeights = isFollowingNucleus
    ? onsetLength.followingNucleus
    : syllableCount >= 3 && onsetLength.long
      ? onsetLength.long
      : onsetLength.default;
  const maxLength =
    targetLength ??
    (monosyllabic
      ? getWeightedOption(onsetLength.monosyllabic, rand)
      : getWeightedOption(polysyllabicWeights, rand));

  if (maxLength === 0) return [];

  const toIgnore = prevSyllable
    ? new Set(prevSyllable.coda.map((coda) => coda.sound))
    : _emptySet;
  const prevNucleus = isFollowingNucleus
    ? prevSyllable.nucleus.at(-1)
    : undefined;
  const bannedFirstOnset = prevNucleus
    ? rt.nucleusRepair.rimes.followingOnset?.get(prevNucleus.sound)
    : undefined;
  const boundaryWeights = rt.clusterWeights?.boundary;
  const previousCoda = boundaryWeights && prevSyllable && lastItem(prevSyllable.coda);

  return buildCluster(rt, {
    rand,
    position: "onset",
    cluster: [],
    clusterSounds: [],
    ignoreSet: toIgnore,
    isStartOfWord,
    isEndOfWord: false,
    syllableCount,
    maxLength,
    followingOpenNucleus: !!isFollowingNucleus,
    bannedFirstOnset,
    firstOnsetWeights: previousCoda && boundaryWeights?.get(previousCoda.sound),
  });
}

function tripleNucleusPenalty(
  context: SelectionCursor,
): ClusterContext["repetitionPenalty"] {
  const policy = context.rootRepetition;
  const multiplier = policy?.tripleNucleusMultiplier;
  if (multiplier === undefined || multiplier === 1 || context.currSyllableIndex < 2
    || context.syllableCount < (policy?.minimumNucleusSyllables ?? 3)) return;
  const { syllables } = context;
  const sound = syllables[context.currSyllableIndex - 1].nucleus[0]?.sound;
  if (sound && sound === syllables[context.currSyllableIndex - 2].nucleus[0]?.sound) {
    return { sound, multiplier };
  }
}

function matchingCodaPenalty(
  policy: LanguageConfig["rootRepetition"],
  onset: readonly Phoneme[],
): ClusterContext["repetitionPenalty"] {
  const sound = lastItem(onset)?.sound;
  if (!policy || !sound) return;
  const overrides = policy.matchingCodaOverrides;
  const multiplier = overrides && Object.hasOwn(overrides, sound)
    ? overrides[sound]
    : policy.matchingCodaMultiplier;
  if (multiplier !== undefined && multiplier !== 1) return { sound, multiplier };
}

function pickNucleus(
  rt: LegacySelectionRuntime,
  context: SelectionCursor,
  isStartOfWord: boolean,
  isEndOfWord: boolean,
  onset: readonly Phoneme[],
  plannedCodaLength: number,
): Phoneme[] {
  return buildCluster(rt, {
    rand: context.rand,
    position: "nucleus",
    cluster: [],
    clusterSounds: [],
    ignoreSet: _emptySet,
    isStartOfWord,
    isEndOfWord,
    nucleusWordEdges: {
      initial: isStartOfWord && onset.length === 0,
      final: isEndOfWord && plannedCodaLength === 0,
    },
    forbidOpenCheckedFinal: rt.nucleusRepair.forbidOpenCheckedFinal,
    excludedAfterOnset: excludedAfterOnset(onset, "nucleus", rt.nucleusRepair.rimes.onsetRime),
    maxLength: 1,
    syllableCount: context.syllableCount,
    repetitionPenalty: tripleNucleusPenalty(context),
  });
}

function codaExtensionRejection(
  candidate: Phoneme,
  rt: LegacySelectionRuntime,
  context: ClusterContext,
): CodaExtensionRejectionReason | undefined {
  const reason = clusterCandidateRejection(candidate, rt, context, "extension");
  if (reason) return reason;
  if (
    !rt.clusterLimits &&
    context.cluster.length + 1 > rt.config.syllableStructure.maxCodaLength
  )
    return "length";
  if (rt.allowedFinalSet && !rt.allowedFinalSet.has(candidate.sound))
    return "word-final";
  // A completed extension must be licensed itself, not merely lead toward a
  // longer listed cluster which this operation will never finish building.
  if (rt.attestedCodaSet && context.cluster.length > 0) {
    const completed = [...context.clusterSounds, candidate.sound].join("|");
    if (!rt.attestedCodaSet.has(completed)) return "attestation";
  }
  return undefined;
}

function canExtendCoda(
  candidate: Phoneme,
  rt: LegacySelectionRuntime,
  clusterContext: ClusterContext,
  context: SelectionCursor,
  extension: "finalS" | "nasalStopExtension",
): boolean {
  const reason = codaExtensionRejection(candidate, rt, clusterContext);
  if (!reason) return true;
  context.trace?.recordStructural({
    event: "codaExtensionRejected",
    extension,
    candidate: candidate.sound,
    coda: [...clusterContext.clusterSounds],
    reason,
    syllableIndex: context.currSyllableIndex,
  });
  return false;
}

function appendCoda(candidate: Phoneme, context: ClusterContext): void {
  context.cluster.push(candidate);
  context.clusterSounds.push(candidate.sound);
}

/** Validate corpus choices against the audited whitelist and the root coda rules. */
function prepareRootFinalCodas(
  rt: LegacySelectionRuntime,
  weights: Readonly<Record<string, number>>,
): FinalCodasByNucleus {
  const clusters = Object.entries(weights).map(([key, weight]) => ({
    sounds: key.split(","), weight,
  }));
  const audited = clusters.map(choice => choice.sounds);
  const codaRuntime: LegacySelectionRuntime = {
    ...rt,
    attestedCodaSet: new Set(audited.map(sounds => sounds.join("|"))),
    attestedCodaPrefixSet: buildPrefixSet(audited),
  };
  const codaPhones = new Map(rt.positionPhonemes.coda.map(phoneme => [phoneme.sound, phoneme]));
  const byNucleus: FinalCodasByNucleus = new Map();
  for (const nucleus of rt.positionPhonemes.nucleus) {
    const byLength: Map<number, [Phoneme[], number][]> = new Map();
    for (const { sounds, weight } of clusters) {
      const last = sounds[sounds.length - 1];
      if (rt.allowedFinalSet && !rt.allowedFinalSet.has(last)) continue;
      const context: ClusterContext = {
        rand: noDraws("Root-final coda preparation must not consume RNG."),
        position: "coda",
        cluster: [],
        clusterSounds: [],
        ignoreSet: _emptySet,
        isStartOfWord: false,
        isEndOfWord: true,
        syllableCount: 1,
        maxLength: sounds.length,
        nucleus: [nucleus],
      };
      for (const sound of sounds) {
        // A known corpus phone can be unlicensed in coda position (/j/).
        const phone = codaPhones.get(sound);
        if (!phone || clusterCandidateRejection(phone, codaRuntime, context, "audited")) break;
        appendCoda(phone, context);
      }
      if (context.cluster.length !== sounds.length) continue;
      const choices = byLength.get(sounds.length) ?? [];
      choices.push([context.cluster, weight]);
      byLength.set(sounds.length, choices);
    }
    byNucleus.set(nucleus.sound, byLength);
  }
  return byNucleus;
}

function pickRootFinalCoda(
  choices: FinalCodasByNucleus,
  syllable: Syllable,
  length: number,
  rt: LegacySelectionRuntime,
  context: SelectionCursor,
): Phoneme[] {
  const byLength = choices.get(syllable.nucleus[0].sound);
  const excluded = excludedAfterOnset(syllable.onset, "coda", rt.nucleusRepair.rimes.onsetRime);
  const listed = byLength?.get(length) ?? byLength?.get(1);
  let options = excluded
    ? listed?.filter(([coda]) => !coda.some((phoneme) => excluded.has(phoneme.sound)))
    : listed;
  const penalty = matchingCodaPenalty(context.rootRepetition, syllable.onset);
  if (penalty && options) {
    options = weightMatchingCoda(options, (coda) => coda[0].sound, penalty, rt.preservedCodaInitials);
  }
  // Underfill an impossible shape so the existing root selection can retry.
  return options?.length ? getWeightedOption(options, context.rand).slice() : [];
}

function pickCoda(
  rt: LegacySelectionRuntime,
  context: SelectionCursor,
  newSyllable: Syllable,
  isEndOfWord: boolean,
  monosyllabic: boolean,
  targetLength?: number,
): Phoneme[] {
  // In plan-driven mode (targetLength set), suppress count-mutating extensions
  // when the coda already matches the plan. This avoids burning retries on
  // overshoots while still allowing mutations when the cluster builder
  // under-fills (giving mutations a chance to close the gap).
  const planDriven = targetLength !== undefined;
  const syllableCount = context.syllableCount;
  const onsetLen = newSyllable.onset.length;
  const { codaLength, probability } = rt.config.generationWeights;

  const weights: [number, number][] = monosyllabic
    ? codaLength.monosyllabic[onsetLen] ?? codaLength.monosyllabicDefault
    : [
      [
        0,
        isEndOfWord
          ? codaLength.zeroWeightEndOfWord
          : codaLength.zeroWeightMidWord,
      ],
      ...codaLength.polysyllabicNonzero,
    ];

  const rand = context.rand;
  const maxLength: number = targetLength ?? getWeightedOption(weights, rand);
  if (maxLength === 0) return [];

  const codaContext: ClusterContext = {
    rand: context.rand,
    position: "coda",
    cluster: [],
    clusterSounds: [],
    ignoreSet: _emptySet,
    isStartOfWord: false,
    isEndOfWord,
    syllableCount,
    maxLength,
    nucleus: newSyllable.nucleus,
    repetitionPenalty: matchingCodaPenalty(context.rootRepetition, newSyllable.onset),
    excludedAfterOnset: excludedAfterOnset(
      newSyllable.onset,
      "coda",
      rt.nucleusRepair.rimes.onsetRime,
    ),
  };
  const coda = buildCluster(rt, codaContext);

  // Extend word-final singleton nasal codas with their voiced homorganic stop
  // In plan-driven mode, allow mutations when coda under-filled OR exactly at
  // target (since mutations close the gap toward the phoneme count target —
  // the outer loop will reject if the total overshoots).
  const nasalExt = probability.nasalStopExtension ?? 0;
  const allowMutations = !planDriven || coda.length <= targetLength;
  if (
    allowMutations &&
    isEndOfWord &&
    nasalExt > 0 &&
    coda.length === 1 &&
    coda[0].mannerOfArticulation === "nasal" &&
    coinFlip(rand, nasalExt)
  ) {
    const nasal = coda[0];
    const stops = rt.positionPhonemes.coda.filter(
      (candidate) =>
        isStop(candidate) &&
        candidate.voiced &&
        candidate.placeOfArticulation === nasal.placeOfArticulation &&
        canExtendCoda(
          candidate,
          rt,
          codaContext,
          context,
          "nasalStopExtension",
        ),
    );
    if (stops.length > 0) {
      const stop =
        stops.length === 1 ? stops[0] : selectPhoneme(stops, codaContext, rt);
      if (stop) {
        appendCoda(stop, codaContext);
        context.trace?.recordStructural({
          event: "nasalStopExtension",
          nasal: nasal.sound,
          appendedStop: stop.sound,
          probability: nasalExt,
          syllableIndex: context.currSyllableIndex,
        });
      }
    }
  }

  if (allowMutations && isEndOfWord) {
    let finalSProbability = probability.finalS;
    let shouldSkipFinalS = false;

    if (coda.length > 0 && rt.clusterWeights?.coda) {
      const weightMap = getClusterWeightMap(
        rt.clusterWeights.coda,
        isEndOfWord,
      );

      const weight = findClusterWeightMultiplier(
        codaContext.clusterSounds,
        "s",
        weightMap,
      );
      if (weight !== NO_CLUSTER_WEIGHT) {
        finalSProbability *= weight;
        shouldSkipFinalS = weight < 0.01;
      }
    }

    if (!shouldSkipFinalS && coinFlip(rand, finalSProbability)) {
      const sPhoneme = rt.positionPhonemes.coda.find(
        (phoneme) => phoneme.sound === "s",
      );
      if (
        sPhoneme &&
        canExtendCoda(sPhoneme, rt, codaContext, context, "finalS")
      ) {
        appendCoda(sPhoneme, codaContext);
        const clusterWeightApplied = finalSProbability !== probability.finalS;
        context.trace?.recordStructural({
          event: "finalS",
          probability: finalSProbability,
          clusterWeightApplied: clusterWeightApplied || undefined,
          clusterWeight:
            clusterWeightApplied && probability.finalS > 0
              ? finalSProbability / probability.finalS
              : undefined,
          syllableIndex: context.currSyllableIndex,
        });
      }
    }
  }

  return coda;
}

function generateSyllable(
  rt: LegacySelectionRuntime,
  context: SelectionCursor,
  syllablePlan: SyllableShapePlan,
  finalCodas: FinalCodasByNucleus | undefined,
): Syllable {
  const isEndOfWord = context.currSyllableIndex === context.syllableCount - 1;
  const isStartOfWord = context.currSyllableIndex === 0;
  const syllableCount = context.syllableCount;
  const monosyllabic = syllableCount === 1;

  const newSyllable: Syllable = {
    onset: [],
    nucleus: [],
    coda: [],
  };

  if (syllablePlan.onsetLength > 0) {
    newSyllable.onset = pickOnset(
      rt,
      context,
      isStartOfWord,
      monosyllabic,
      syllablePlan.onsetLength,
    );
  }

  newSyllable.nucleus = pickNucleus(
    rt,
    context,
    isStartOfWord,
    isEndOfWord,
    newSyllable.onset,
    syllablePlan.codaLength,
  );
  if (newSyllable.nucleus.length === 0)
    throw new Error(
      "No eligible nucleus for the planned base-word segment position.",
    );

  if (syllablePlan.codaLength > 0) {
    const finalChoices = isEndOfWord ? finalCodas : undefined;
    newSyllable.coda = finalChoices
      ? pickRootFinalCoda(finalChoices, newSyllable, syllablePlan.codaLength, rt, context)
      : pickCoda(rt, context, newSyllable, isEndOfWord, monosyllabic, syllablePlan.codaLength);
  }

  return newSyllable;
}

export function createLegacyWeightedEngine(rt: LegacySelectionRuntime): SegmentEngine {
  const rootFinalCodas: Partial<Record<GenerationMode, FinalCodasByNucleus>> = {};
  for (const mode of ["text", "lexicon"] as const) {
    const profile = rt.config.generationWeights.codaLength.rootFinalByMode?.[mode];
    if (profile) rootFinalCodas[mode] = prepareRootFinalCodas(rt, profile.counts);
  }

  return {
    selectSegments(plans, { mode, streams, rootRepetition, trace }) {
      const rand = streams("select_segments");
      const syllables: Syllable[] = new Array(plans.length);
      const cursor: SelectionCursor = {
        syllables, syllableCount: plans.length, currSyllableIndex: 0, rand, rootRepetition, trace,
      };
      const finalCodas = rootFinalCodas[mode];
      for (let i = 0; i < plans.length; i++) {
        cursor.currSyllableIndex = i;
        const syllable = generateSyllable(rt, cursor, plans[i], finalCodas);
        if (i > 0) adjustBoundary(rt, syllables[i - 1], syllable, streams("adjust_boundary"), i, trace);
        syllables[i] = syllable;
      }
      if (syllables.length > 1) {
        repairVowelHiatus(rt.bridgePhonemeOptions, syllables, streams("repair_vowel_hiatus"), trace);
      }
      return syllables;
    },
  };
}

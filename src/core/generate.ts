import { ClusterContext, Phoneme, WordGenerationContext, WordGenerationOptions, Word, Syllable, SyllableShapePlan, getPhonemePositionWeight, GenerationMode } from "../types.js";
import { RNG, createSeededRng, createDefaultRng } from "../utils/random.js";
import getWeightedOption from "../utils/getWeightedOption.js";
import { LanguageConfig, computeSonorityLevels, validateConfig, ClusterLimits, SonorityConstraints } from "../config/language.js";
import { englishConfig } from "../config/english.js";
import { applyStress, generatePronunciation } from "./pronounce.js";
import { createWrittenFormGenerator, isJunctionSonorityValid } from "./write.js";
import { repairClusters, repairFinalCoda, repairClusterShape, repairHAfterBackVowel } from "./repair.js";
import { repairStressedNuclei } from "./stress-repair.js";
import { planMorphology, applyMorphology } from "./morphology/index.js";
import { TraceCollector } from "./trace.js";

// ---------------------------------------------------------------------------
// Runtime: pre-computed data derived from a LanguageConfig
// ---------------------------------------------------------------------------

interface GeneratorRuntime {
  config: LanguageConfig;
  sonorityLevels: Map<Phoneme, number>;
  /** Sonority level by phoneme sound string (for quick lookup). */
  sonorityBySound: Map<string, number>;
  positionPhonemes: { onset: Phoneme[]; coda: Phoneme[]; nucleus: Phoneme[] };
  invalidClusterRegexes: {
    onset: RegExp | null;
    coda: RegExp | null;
    /** Maps to config.invalidClusters.boundary — keyed "nucleus" because
     *  ClusterContext.position uses "nucleus" as the catch-all third position. */
    nucleus: RegExp | null;
  };
  generateWrittenForm: (context: WordGenerationContext) => void;
  bannedSet?: Set<string>;
  clusterRepair?: "drop-coda" | "drop-onset";
  allowedFinalSet?: Set<string>;
  bannedCodaSet?: Set<string>;
  /** Map from nucleus sound to set of banned coda sounds. */
  bannedNucleusCodaMap?: Map<string, Set<string>>;
  clusterLimits?: ClusterLimits;
  sonorityConstraints?: SonorityConstraints;
  codaAppendantSet?: Set<string>;
  onsetPrependerSet?: Set<string>;
  sonorityExemptSet?: Set<string>;
  attestedOnsetSet?: Set<string>;
  attestedCodaSet?: Set<string>;
  attestedOnsetPrefixSet?: Set<string>;
  attestedCodaPrefixSet?: Set<string>;
  clusterWeights?: {
    onset?: Map<string, number>;
    coda?: Map<string, number> | {
      final?: Map<string, number>;
      nonFinal?: Map<string, number>;
    };
  };
}

/** Build a set of all proper prefixes for attested clusters (excludes the full key). */
function buildPrefixSet(clusters: string[][]): Set<string> {
  const set = new Set<string>();
  for (const parts of clusters) {
    for (let i = 1; i < parts.length; i++) {
      set.add(parts.slice(0, i).join("|"));
    }
  }
  return set;
}

function buildRuntime(config: LanguageConfig): GeneratorRuntime {
  validateConfig(config);
  const sonorityLevels = computeSonorityLevels(config);

  const positionPhonemes = {
    onset: Array.from(config.phonemeMaps.onset.values()).flat(),
    coda: Array.from(config.phonemeMaps.coda.values()).flat(),
    nucleus: Array.from(config.phonemeMaps.nucleus.values()).flat(),
  };

  const makeRegex = (patterns: string[]) =>
    patterns.length > 0 ? new RegExp(patterns.join("|"), "i") : null;

  const invalidClusterRegexes = {
    onset: makeRegex(config.invalidClusters.onset),
    coda: makeRegex(config.invalidClusters.coda),
    nucleus: makeRegex(config.invalidClusters.boundary),
  };

  const generateWrittenForm = createWrittenFormGenerator(config);

  const bannedSet = config.clusterConstraint?.banned
    ? new Set(config.clusterConstraint.banned.map(([a, b]) => `${a}|${b}`))
    : undefined;

  const sonorityBySound = new Map<string, number>();
  for (const [phoneme, level] of sonorityLevels) {
    sonorityBySound.set(phoneme.sound, level);
  }

  const cl = config.clusterLimits;
  const sc = config.sonorityConstraints;

  // Build cluster weight maps from config
  const clusterWeights = config.clusterWeights ? {
    onset: config.clusterWeights.onset ? new Map(Object.entries(config.clusterWeights.onset)) : undefined,
    coda: config.clusterWeights.coda ? (
      // Check if position-based format (has 'final' or 'nonFinal' keys)
      typeof config.clusterWeights.coda === "object" &&
      ("final" in config.clusterWeights.coda || "nonFinal" in config.clusterWeights.coda)
        ? {
          final: config.clusterWeights.coda.final ? new Map(Object.entries(config.clusterWeights.coda.final)) : undefined,
          nonFinal: config.clusterWeights.coda.nonFinal ? new Map(Object.entries(config.clusterWeights.coda.nonFinal)) : undefined,
        }
        : new Map(Object.entries(config.clusterWeights.coda as Record<string, number>))
    ) : undefined,
  } : undefined;

  // Build banned nucleus+coda map for efficient lookup during coda selection
  const bannedNucleusCodaMap = config.codaConstraints?.bannedNucleusCodaCombinations
    ? (() => {
      const map = new Map<string, Set<string>>();
      for (const { nucleus, coda } of config.codaConstraints.bannedNucleusCodaCombinations) {
        for (const n of nucleus) {
          if (!map.has(n)) map.set(n, new Set());
          for (const c of coda) {
              map.get(n)!.add(c);
          }
        }
      }
      return map;
    })()
    : undefined;

  return {
    config, sonorityLevels, sonorityBySound, positionPhonemes, invalidClusterRegexes, generateWrittenForm,
    bannedSet,
    clusterRepair: config.clusterConstraint?.repair,
    allowedFinalSet: config.codaConstraints?.allowedFinal
      ? new Set(config.codaConstraints.allowedFinal)
      : undefined,
    bannedCodaSet: config.codaConstraints?.bannedCodas
      ? new Set(config.codaConstraints.bannedCodas)
      : undefined,
    bannedNucleusCodaMap,
    clusterLimits: cl,
    sonorityConstraints: sc,
    codaAppendantSet: cl?.codaAppendants ? new Set(cl.codaAppendants) : undefined,
    onsetPrependerSet: cl?.onsetPrependers ? new Set(cl.onsetPrependers) : undefined,
    sonorityExemptSet: sc?.exempt ? new Set(sc.exempt) : undefined,
    attestedOnsetSet: cl?.attestedOnsets
      ? new Set(cl.attestedOnsets.map(a => a.join("|")))
      : undefined,
    attestedCodaSet: cl?.attestedCodas
      ? new Set(cl.attestedCodas.map(a => a.join("|")))
      : undefined,
    attestedOnsetPrefixSet: cl?.attestedOnsets
      ? buildPrefixSet(cl.attestedOnsets)
      : undefined,
    attestedCodaPrefixSet: cl?.attestedCodas
      ? buildPrefixSet(cl.attestedCodas)
      : undefined,
    clusterWeights,
  };
}

// ---------------------------------------------------------------------------
// Sonority
// ---------------------------------------------------------------------------

function getSonority(rt: GeneratorRuntime, phoneme: Phoneme): number {
  return rt.sonorityLevels.get(phoneme) ?? 0;
}

// ---------------------------------------------------------------------------
// Cluster building
// ---------------------------------------------------------------------------

function buildCluster(rt: GeneratorRuntime, context: ClusterContext): Phoneme[] {
  const allPositionPhonemes = rt.positionPhonemes[context.position];

  while (context.cluster.length < context.maxLength) {
    const validCandidates = getValidCandidates(allPositionPhonemes, rt, context);
    if (validCandidates.length === 0) break;

    const newPhoneme = selectPhoneme(validCandidates, context, rt);
    if (!newPhoneme) break;

    context.cluster.push(newPhoneme);
    if (shouldStopClusterGrowth(context, rt)) break;
  }

  return context.cluster;
}

function getValidCandidates(candidatePhonemes: Phoneme[], rt: GeneratorRuntime, context: ClusterContext): Phoneme[] {
  return candidatePhonemes.filter(p => isValidCandidate(p, rt, context));
}

function isValidCandidate(p: Phoneme, rt: GeneratorRuntime, context: ClusterContext): boolean {
  if (context.ignore.includes(p.sound) ||
      context.cluster.some(existingP => existingP.sound === p.sound) ||
      !isValidPosition(p, context)) {
    return false;
  }

  // Reject phonemes banned from coda position entirely
  if (context.position === "coda" && rt.bannedCodaSet?.has(p.sound)) {
    return false;
  }

  // Reject coda phonemes banned after the current nucleus
  if (context.position === "coda" && context.nucleus && rt.bannedNucleusCodaMap) {
    // Check each nucleus phoneme (typically just one, but could be complex nucleus)
    for (const nuc of context.nucleus) {
      const bannedCodas = rt.bannedNucleusCodaMap.get(nuc.sound);
      if (bannedCodas?.has(p.sound)) {
        return false;
      }
    }
  }

  // Check cluster weight threshold: reject if weight multiplier is below 0.01 (1%)
  // This prevents overly suppressed clusters from being generated at all
  if (context.cluster.length > 0 && rt.clusterWeights) {
    const weightsForPosition = context.position === "onset" ? rt.clusterWeights.onset : rt.clusterWeights.coda;
    if (weightsForPosition) {
      const clusterSounds = context.cluster.map(ph => ph.sound);
      const fullCluster = [...clusterSounds, p.sound];
      
      // Get the appropriate weight map
      let weightMap: Map<string, number> | undefined;
      if (typeof weightsForPosition === "object" && "final" in weightsForPosition) {
        const isFinalSyllable = context.isEndOfWord;
        weightMap = isFinalSyllable ? weightsForPosition.final : weightsForPosition.nonFinal;
      } else {
        weightMap = weightsForPosition as Map<string, number>;
      }
      
      // Check if any cluster suffix has a weight below threshold
      if (weightMap) {
        for (let i = 0; i < fullCluster.length; i++) {
          const suffix = fullCluster.slice(i).join(",");
          const weight = weightMap.get(suffix);
          if (weight !== undefined && weight < 0.01) {
            return false;  // Reject this candidate
          }
        }
      }
    }
  }

  // When attested onset whitelist exists, use it as the primary gate for onsets
  // instead of the general sonority/regex checks
  if (context.position === "onset" && rt.attestedOnsetSet && context.cluster.length > 0) {
    const key = [...context.cluster.map(ph => ph.sound), p.sound].join("|");
    // Must be an exact attested onset or a prefix of one
    if (rt.attestedOnsetSet.has(key)) return true;
    return Array.from(rt.attestedOnsetSet).some(a => a.startsWith(key + "|"));
  }

  // When attested coda whitelist exists, use it as the primary gate for codas
  if (context.position === "coda" && rt.attestedCodaSet && context.cluster.length > 0) {
    const key = [...context.cluster.map(ph => ph.sound), p.sound].join("|");
    if (rt.attestedCodaSet.has(key)) return true;
    return Array.from(rt.attestedCodaSet).some(a => a.startsWith(key + "|"));
  }

  // Fallback: standard sonority and regex checks
  if (!checkSonority(p, rt, context)) return false;

  const regex = rt.invalidClusterRegexes[context.position];
  if (regex) {
    const potentialCluster = context.cluster.map(ph => ph.sound).join("") + p.sound;
    if (regex.test(potentialCluster)) return false;
  }

  return true;
}

function isValidPosition(p: Phoneme, { position, isStartOfWord, isEndOfWord }: ClusterContext): boolean {
  const positionWeight = getPhonemePositionWeight(p, position);
  return (positionWeight === undefined || positionWeight > 0) &&
         (!isStartOfWord || p.startWord === undefined || p.startWord > 0) &&
         (!isEndOfWord || p.endWord === undefined || p.endWord > 0);
}

function isValidCluster(rt: GeneratorRuntime, cluster: Phoneme[], position: "onset" | "coda" | "nucleus"): boolean {
  const regex = rt.invalidClusterRegexes[position];
  if (!regex) return true;
  const potentialCluster = cluster.map(ph => ph.sound).join("");
  return !regex.test(potentialCluster);
}

// ---------------------------------------------------------------------------
// Sonority checks
// ---------------------------------------------------------------------------

function checkSonority(p: Phoneme, rt: GeneratorRuntime, { cluster, position }: ClusterContext): boolean {
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

function checkOnsetSonority(currPhoneme: Phoneme, rt: GeneratorRuntime, cluster: Phoneme[], prevPhoneme: Phoneme | undefined): boolean {
  if (cluster.length === 0) return true;

  const isSClusterException =
    cluster.length === 1 &&
    cluster[0].sound === "s" &&
    ["t", "p", "k"].includes(currPhoneme.sound);

  if (isSClusterException) return true;

  if (currPhoneme.placeOfArticulation === prevPhoneme?.placeOfArticulation) return false;

  const lastPhonemeWasAStop = prevPhoneme && ["stop"].includes(prevPhoneme.mannerOfArticulation);
  const canFollowAStop = lastPhonemeWasAStop ? ["glide", "liquid"].includes(currPhoneme.mannerOfArticulation) : false;

  return lastPhonemeWasAStop ? canFollowAStop : getSonority(rt, currPhoneme) > getSonority(rt, prevPhoneme!);
}

function checkCodaSonority(currPhoneme: Phoneme, rt: GeneratorRuntime, prevPhoneme: Phoneme | undefined): boolean {
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

// ---------------------------------------------------------------------------
// Phoneme selection
// ---------------------------------------------------------------------------

function selectPhoneme(validCandidates: Phoneme[], context: ClusterContext, rt?: GeneratorRuntime): Phoneme | null {
  const { position, isStartOfWord, isEndOfWord, rand, cluster } = context;
  
  const weightedCandidates = validCandidates.map(p => {
    const positionWeight = p[position] ?? 0;
    const wordPositionModifier =
      (isStartOfWord && p.startWord) ||
      (isEndOfWord && p.endWord) ||
      p.midWord || 1;
    
    let baseWeight = positionWeight * wordPositionModifier;
    
    // Apply cluster-specific weight multiplier if this phoneme would create a weighted cluster.
    // Also applies to the FIRST consonant of a planned cluster (cluster.length === 0 but maxLength >= 2)
    // so that cluster-initiating consonants can be independently weighted (e.g. suppress /dr/).
    if (rt && (cluster.length > 0 || context.maxLength >= 2) && rt.clusterWeights) {
      const weightsForPosition = position === "onset" ? rt.clusterWeights.onset : rt.clusterWeights.coda;
      if (weightsForPosition) {
        // Build potential cluster keys: check all suffixes of the forming cluster
        // For cluster [n, t] + candidate s, check: "s", "t,s", "n,t,s"
        const clusterSounds = cluster.map(ph => ph.sound);
        const fullCluster = [...clusterSounds, p.sound];
        let multiplier: number | undefined;
        
        // Get the appropriate weight map based on format
        let weightMap: Map<string, number> | undefined;
        if (typeof weightsForPosition === "object" && "final" in weightsForPosition) {
          // Position-based format: check final vs. nonFinal
          const isFinalSyllable = isEndOfWord;
          weightMap = isFinalSyllable ? weightsForPosition.final : weightsForPosition.nonFinal;
        } else {
          // Uniform format: single map
          weightMap = weightsForPosition as Map<string, number>;
        }
        
        // Check all possible cluster suffixes, longest first
        // This allows matching both specific long clusters (n,t,s) and shorter patterns (t,s)
        if (weightMap) {
          for (let i = 0; i < fullCluster.length; i++) {
            const suffix = fullCluster.slice(i).join(",");
            const weight = weightMap.get(suffix);
            if (weight !== undefined) {
              multiplier = weight;
              break;  // Use first (longest) match
            }
          }
        }
        
        if (multiplier !== undefined) {
          baseWeight *= multiplier;
        }
      }
    }
    
    return [p, baseWeight] as [Phoneme, number];
  });
  
  return getWeightedOption(weightedCandidates, rand);
}

function shouldStopClusterGrowth(context: ClusterContext, rt: GeneratorRuntime): boolean {
  const { position, cluster } = context;

  // Check cluster length limits
  if (rt.clusterLimits) {
    const cl = rt.clusterLimits;
    if (position === "onset" && cluster.length >= cl.maxOnset) return true;
    if (position === "coda") {
      const effectiveMax = rt.codaAppendantSet && cluster.length > 0 &&
        rt.codaAppendantSet.has(cluster[cluster.length - 1].sound)
        ? cl.maxCoda + 1
        : cl.maxCoda;
      if (cluster.length >= effectiveMax) return true;
    }
  }

  // For onsets with attested whitelist: stop if current cluster is an exact match
  // and no longer attested onset extends it
  if (position === "onset" && rt.attestedOnsetSet && cluster.length >= 2) {
    const key = cluster.map(ph => ph.sound).join("|");
    if (rt.attestedOnsetSet.has(key)) {
      // Check if any longer attested onset extends this
      const hasLonger = Array.from(rt.attestedOnsetSet).some(a => a.startsWith(key + "|"));
      if (!hasLonger) return true;
    }
  }

  // For codas with attested whitelist: stop if current cluster is an exact match
  // and no longer attested coda extends it
  if (position === "coda" && rt.attestedCodaSet && cluster.length >= 2) {
    const key = cluster.map(ph => ph.sound).join("|");
    if (rt.attestedCodaSet.has(key)) {
      const hasLonger = Array.from(rt.attestedCodaSet).some(a => a.startsWith(key + "|"));
      if (!hasLonger) return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Syllable picking
// ---------------------------------------------------------------------------

function pickOnset(
  rt: GeneratorRuntime,
  context: WordGenerationContext,
  isStartOfWord: boolean,
  monosyllabic: boolean,
  targetLength?: number,
): Phoneme[] {
  const prevSyllable = context.word.syllables[context.currSyllableIndex - 1];
  const isFollowingNucleus = prevSyllable && prevSyllable.coda.length === 0;
  const syllableCount = context.syllableCount;
  const { onsetLength } = rt.config.generationWeights;

  const rand = context.rand;
  const polysyllabicWeights = isFollowingNucleus
    ? onsetLength.followingNucleus
    : (syllableCount >= 3 && onsetLength.long) ? onsetLength.long : onsetLength.default;
  const maxLength = targetLength ?? (monosyllabic
    ? getWeightedOption(onsetLength.monosyllabic, rand)
    : getWeightedOption(polysyllabicWeights, rand));

  if (maxLength === 0) return [];

  const toIgnore = prevSyllable ? prevSyllable.coda.map((coda) => coda.sound) : [];

  // OCP for glides: block /j/ and /w/ onsets after any bare nucleus.
  // English essentially never places a glide onset immediately after a vowel
  // with no intervening coda — any vowel can write as a letter that collides
  // with the glide grapheme (ə→u + w = "uw", ʌ→u + w = "uw", ə→i + j = "iy").
  if (isFollowingNucleus) {
    toIgnore.push("j", "w");
  }

  return buildCluster(rt, {
    rand,
    position: "onset",
    cluster: [],
    ignore: toIgnore,
    isStartOfWord,
    isEndOfWord: false,
    syllableCount,
    maxLength,
  });
}

function pickNucleus(rt: GeneratorRuntime, context: WordGenerationContext, isStartOfWord: boolean, isEndOfWord: boolean): Phoneme[] {
  return buildCluster(rt, {
    rand: context.rand,
    position: "nucleus",
    cluster: [],
    ignore: [],
    isStartOfWord,
    isEndOfWord,
    maxLength: 1,
    syllableCount: context.syllableCount,
  });
}

function pickCoda(
  rt: GeneratorRuntime,
  context: WordGenerationContext,
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
    ? (codaLength.monosyllabic[onsetLen] ?? codaLength.monosyllabicDefault)
    : [
      [0, isEndOfWord ? codaLength.zeroWeightEndOfWord : codaLength.zeroWeightMidWord],
      ...codaLength.polysyllabicNonzero,
    ];

  const rand = context.rand;
  const maxLength: number = targetLength ?? getWeightedOption(weights, rand);
  if (maxLength === 0) return [];

  const coda: Phoneme[] = buildCluster(rt, {
    rand: context.rand,
    position: "coda",
    cluster: [],
    ignore: [],
    isStartOfWord: false,
    isEndOfWord,
    syllableCount,
    maxLength,
    nucleus: newSyllable.nucleus,
  });

  // Extend word-final singleton nasal codas with their voiced homorganic stop
  // In plan-driven mode, allow mutations when coda under-filled OR exactly at
  // target (since mutations close the gap toward the phoneme count target —
  // the outer loop will reject if the total overshoots).
  const nasalExt = probability.nasalStopExtension ?? 0;
  const allowMutations = !planDriven || coda.length <= targetLength;
  if (allowMutations && isEndOfWord && nasalExt > 0 && coda.length === 1 &&
      coda[0].mannerOfArticulation === "nasal" &&
      getWeightedOption([[true, nasalExt], [false, 100 - nasalExt]], rand)) {
    const nasalSound = coda[0].sound;
    const stopSound = nasalSound === "n" ? "d" : nasalSound === "m" ? "b" : nasalSound === "ŋ" ? "g" : null;
    if (stopSound) {
      const stopPhoneme = rt.config.phonemes.find(p => p.sound === stopSound);
      if (stopPhoneme) {
        coda.push(stopPhoneme);
        context.trace?.recordStructural("nasalStopExtension", `extended /${nasalSound}/ with /${stopSound}/ (prob ${nasalExt}%)`);
      }
    }
  }

  // Add 's' to the end of the last syllable occasionally
  if (allowMutations && isEndOfWord) {
    let finalSProbability = probability.finalS;
    let shouldSkipFinalS = false;
    
    // Apply cluster-specific weight if appending /s/ would create a weighted cluster
    if (coda.length > 0 && rt.clusterWeights?.coda) {
      const clusterSounds = coda.map(ph => ph.sound);
      const fullCluster = [...clusterSounds, "s"];
      let multiplier: number | undefined;
      
      // Get the appropriate weight map
      const codaWeights = rt.clusterWeights.coda;
      let weightMap: Map<string, number> | undefined;
      if (typeof codaWeights === "object" && "final" in codaWeights) {
        // Position-based format: use final weights (since isEndOfWord is true)
        weightMap = codaWeights.final;
      } else {
        // Uniform format: single map
        weightMap = codaWeights as Map<string, number>;
      }
      
      // Check all possible cluster suffixes, longest first
      if (weightMap) {
        for (let i = 0; i < fullCluster.length; i++) {
          const suffix = fullCluster.slice(i).join(",");
          const weight = weightMap.get(suffix);
          if (weight !== undefined) {
            multiplier = weight;
            // Apply threshold check: if weight < 0.01, skip finalS entirely
            if (weight < 0.01) {
              shouldSkipFinalS = true;
            }
            break;
          }
        }
      }
      
      if (multiplier !== undefined && !shouldSkipFinalS) {
        finalSProbability *= multiplier;
      }
    }
    
    if (!shouldSkipFinalS && getWeightedOption([[true, finalSProbability], [false, 100 - finalSProbability]], rand)) {
      const sPhoneme = rt.config.phonemes.find(p => p.sound === "s");
      if (sPhoneme) {
        coda.push(sPhoneme);
        if (finalSProbability !== probability.finalS) {
          context.trace?.recordStructural("finalS", `appended /s/ to final coda (prob ${probability.finalS}% × cluster weight ${finalSProbability / probability.finalS})`);
        } else {
          context.trace?.recordStructural("finalS", `appended /s/ to final coda (prob ${probability.finalS}%)`);
        }
      }
    }
  }

  return coda;
}

// ---------------------------------------------------------------------------
// Boundary adjustment
// ---------------------------------------------------------------------------

/**
 * Adjusts two adjacent syllables based on sonority and phonological rules.
 *
 * Two checks, applied in sequence:
 * 1. Equal-sonority boundary drop (original): 90% chance to drop coda-final
 *    when it has the same fine-grained sonority as the onset-initial.
 * 2. Full-cluster SSP validation: if the combined coda+onset cluster violates
 *    the Sonority Sequencing Principle (using coarse manner-class groupings),
 *    drop coda phonemes until the cluster is valid. This prevents impossible
 *    consonant clusters from ever reaching the write phase.
 */
function adjustBoundary(rt: GeneratorRuntime, prevSyllable: Syllable, currentSyllable: Syllable, rand: RNG, trace?: TraceCollector): [Syllable, Syllable] {
  const lastCodaPhoneme = prevSyllable.coda.at(-1);
  const firstOnsetPhoneme = currentSyllable.onset[0];

  if (!lastCodaPhoneme || !firstOnsetPhoneme) return [prevSyllable, currentSyllable];

  // Check 1: equal-sonority probabilistic drop (fine-grained levels)
  const lastCodaSonority = getSonority(rt, lastCodaPhoneme);
  const firstOnsetSonority = getSonority(rt, firstOnsetPhoneme);
  const { boundaryDrop } = rt.config.generationWeights.probability;
  if (firstOnsetSonority === lastCodaSonority && getWeightedOption([[true, boundaryDrop], [false, 100 - boundaryDrop]], rand)) {
    trace?.recordStructural("boundaryDrop", `dropped coda /${lastCodaPhoneme.sound}/ before onset /${firstOnsetPhoneme.sound}/ (equal sonority ${lastCodaSonority}, prob ${boundaryDrop}%)`);
    prevSyllable.coda.pop();
  }

  // Check 2: full-cluster SSP validation (coarse manner-class levels)
  // Drop coda-final phonemes until the cluster is valid or coda is empty.
  const maxDrops = prevSyllable.coda.length;
  for (let d = 0; d < maxDrops; d++) {
    if (prevSyllable.coda.length === 0) break;
    if (isJunctionSonorityValid(prevSyllable.coda, currentSyllable.onset, rt.config)) break;
    const dropped = prevSyllable.coda.pop()!;
    trace?.recordStructural("sspBoundaryDrop", `dropped coda /${dropped.sound}/ — SSP violation in cluster [${prevSyllable.coda.map(p => p.sound).join(",")}].{${currentSyllable.onset.map(p => p.sound).join(",")}}`);
  }

  return [prevSyllable, currentSyllable];
}

// ---------------------------------------------------------------------------
// Syllable generation
// ---------------------------------------------------------------------------

function getOnsetLengthWeights(
  rt: GeneratorRuntime,
  syllableCount: number,
  prevCodaLength: number,
): [number, number][] {
  const { onsetLength } = rt.config.generationWeights;
  if (syllableCount === 1) return onsetLength.monosyllabic;
  if (prevCodaLength === 0) return onsetLength.followingNucleus;
  if (syllableCount >= 3 && onsetLength.long) return onsetLength.long;
  return onsetLength.default;
}

function getCodaLengthWeights(
  rt: GeneratorRuntime,
  syllableCount: number,
  onsetLen: number,
  isEndOfWord: boolean,
): [number, number][] {
  const { codaLength } = rt.config.generationWeights;
  if (syllableCount === 1) {
    return codaLength.monosyllabic[onsetLen] ?? codaLength.monosyllabicDefault;
  }
  return [
    [0, isEndOfWord ? codaLength.zeroWeightEndOfWord : codaLength.zeroWeightMidWord],
    ...codaLength.polysyllabicNonzero,
  ];
}

function getLengthWeight(weights: [number, number][], length: number): number {
  return weights.find(([len]) => len === length)?.[1] ?? 0.0001;
}

function getTopDownPhonemeLengthWeights(rt: GeneratorRuntime, mode: GenerationMode): [number, number][] {
  const weights = rt.config.phonemeLengthWeights[mode];
  if (!weights?.length) {
    throw new Error(`Missing phonemeLengthWeights.${mode} in language config`);
  }
  return weights;
}

function getTopDownSyllableWeights(rt: GeneratorRuntime, mode: GenerationMode, phonemeCount: number): [number, number][] {
  const table = rt.config.phonemeToSyllableWeights[mode];
  if (!table) {
    throw new Error(`Missing phonemeToSyllableWeights.${mode} in language config`);
  }
  const weights = table[phonemeCount];
  if (!weights?.length) {
    throw new Error(`Missing phonemeToSyllableWeights.${mode}.${phonemeCount} in language config`);
  }
  return weights;
}

function sampleTargetPhonemeCount(
  rt: GeneratorRuntime,
  mode: GenerationMode,
  rand: RNG,
  forcedSyllableCount?: number,
): number {
  const allWeights = getTopDownPhonemeLengthWeights(rt, mode);
  if (!forcedSyllableCount) return getWeightedOption(allWeights, rand);

  const maxOnset = rt.clusterLimits?.maxOnset ?? rt.config.syllableStructure.maxOnsetLength;
  const maxCoda = rt.clusterLimits?.maxCoda ?? rt.config.syllableStructure.maxCodaLength;
  // +1 provides headroom for rare plan overshoots (e.g. repair passes).
  const maxPhonemes = forcedSyllableCount + forcedSyllableCount * (maxOnset + maxCoda) + 1;

  const filtered = allWeights.filter(([phonemeCount]) =>
    phonemeCount >= forcedSyllableCount && phonemeCount <= maxPhonemes,
  );
  const pool = filtered.length > 0 ? filtered : allWeights;
  return getWeightedOption(pool, rand);
}

function sampleSyllableCountForTarget(
  rt: GeneratorRuntime,
  mode: GenerationMode,
  targetPhonemes: number,
  rand: RNG,
  forcedSyllableCount?: number,
): number {
  if (forcedSyllableCount && forcedSyllableCount > 0) return forcedSyllableCount;

  const maxOnset = rt.clusterLimits?.maxOnset ?? rt.config.syllableStructure.maxOnsetLength;
  const maxCoda = rt.clusterLimits?.maxCoda ?? rt.config.syllableStructure.maxCodaLength;
  const canSatisfy = (syllableCount: number) => {
    const maxPhonemes = syllableCount + syllableCount * (maxOnset + maxCoda) + 1;
    return targetPhonemes <= maxPhonemes;
  };

  const weights = getTopDownSyllableWeights(rt, mode, targetPhonemes);
  const feasible = weights.filter(([syllableCount]) => canSatisfy(syllableCount));
  if (feasible.length > 0) {
    return getWeightedOption(feasible, rand);
  }
  return getWeightedOption(weights, rand);
}

function sampleConsonantPlan(rt: GeneratorRuntime, syllableCount: number, rand: RNG): SyllableShapePlan[] {
  const plan: SyllableShapePlan[] = [];
  let prevCodaLength = 0;

  for (let i = 0; i < syllableCount; i++) {
    const isEndOfWord = i === syllableCount - 1;
    const onsetWeights = getOnsetLengthWeights(rt, syllableCount, prevCodaLength);
    const onsetLength = getWeightedOption(onsetWeights, rand);
    const codaWeights = getCodaLengthWeights(rt, syllableCount, onsetLength, isEndOfWord);
    const codaLength = getWeightedOption(codaWeights, rand);
    plan.push({ onsetLength, codaLength });
    prevCodaLength = codaLength;
  }

  return plan;
}

function tweakConsonantPlanToBudget(
  rt: GeneratorRuntime,
  plan: SyllableShapePlan[],
  targetConsonants: number,
  rand: RNG,
): SyllableShapePlan[] {
  const adjusted = plan.map(s => ({ ...s }));
  const syllableCount = adjusted.length;
  const maxOnset = rt.clusterLimits?.maxOnset ?? rt.config.syllableStructure.maxOnsetLength;
  const maxCoda = rt.clusterLimits?.maxCoda ?? rt.config.syllableStructure.maxCodaLength;

  let total = adjusted.reduce((sum, s) => sum + s.onsetLength + s.codaLength, 0);

  while (total < targetConsonants) {
    const candidates: Array<{
      syllableIndex: number;
      position: "onset" | "coda";
      weight: number;
    }> = [];

    for (let i = 0; i < syllableCount; i++) {
      const isEndOfWord = i === syllableCount - 1;
      const prevCodaLength = i === 0 ? 0 : adjusted[i - 1].codaLength;
      const onsetWeights = getOnsetLengthWeights(rt, syllableCount, prevCodaLength);
      const codaWeights = getCodaLengthWeights(rt, syllableCount, adjusted[i].onsetLength, isEndOfWord);

      if (adjusted[i].onsetLength < maxOnset) {
        const next = adjusted[i].onsetLength + 1;
        candidates.push({ syllableIndex: i, position: "onset", weight: getLengthWeight(onsetWeights, next) });
      }
      if (adjusted[i].codaLength < maxCoda) {
        const next = adjusted[i].codaLength + 1;
        candidates.push({ syllableIndex: i, position: "coda", weight: getLengthWeight(codaWeights, next) });
      }
    }

    if (candidates.length === 0) break;
    const picked = getWeightedOption(candidates.map(c => [c, c.weight]), rand);
    adjusted[picked.syllableIndex][picked.position === "onset" ? "onsetLength" : "codaLength"]++;
    total++;
  }

  while (total > targetConsonants) {
    const candidates: Array<{
      syllableIndex: number;
      position: "onset" | "coda";
      weight: number;
    }> = [];

    for (let i = 0; i < syllableCount; i++) {
      const isEndOfWord = i === syllableCount - 1;
      const prevCodaLength = i === 0 ? 0 : adjusted[i - 1].codaLength;
      const onsetWeights = getOnsetLengthWeights(rt, syllableCount, prevCodaLength);
      const codaWeights = getCodaLengthWeights(rt, syllableCount, adjusted[i].onsetLength, isEndOfWord);

      if (adjusted[i].onsetLength > 0) {
        const curr = adjusted[i].onsetLength;
        candidates.push({ syllableIndex: i, position: "onset", weight: 1 / getLengthWeight(onsetWeights, curr) });
      }
      if (adjusted[i].codaLength > 0) {
        const curr = adjusted[i].codaLength;
        candidates.push({ syllableIndex: i, position: "coda", weight: 1 / getLengthWeight(codaWeights, curr) });
      }
    }

    if (candidates.length === 0) break;
    const picked = getWeightedOption(candidates.map(c => [c, c.weight]), rand);
    adjusted[picked.syllableIndex][picked.position === "onset" ? "onsetLength" : "codaLength"]--;
    total--;
  }

  return adjusted;
}

function distributePhonemes(
  rt: GeneratorRuntime,
  targetPhonemes: number,
  syllableCount: number,
  rand: RNG,
): SyllableShapePlan[] {
  const maxOnset = rt.clusterLimits?.maxOnset ?? rt.config.syllableStructure.maxOnsetLength;
  const maxCoda = rt.clusterLimits?.maxCoda ?? rt.config.syllableStructure.maxCodaLength;
  const maxConsonants = syllableCount * (maxOnset + maxCoda);

  // Clamp target consonants to feasible range instead of throwing.
  const rawTargetConsonants = targetPhonemes - syllableCount;
  const targetConsonants = Math.max(0, Math.min(rawTargetConsonants, maxConsonants));

  // Sample one natural plan, then tweak to match the budget.
  // The old approach tried 200 random samples hoping for an exact match —
  // this is O(syllableCount) instead of O(200 × syllableCount).
  const plan = sampleConsonantPlan(rt, syllableCount, rand);
  const consonants = plan.reduce((sum, s) => sum + s.onsetLength + s.codaLength, 0);
  if (consonants === targetConsonants) return plan;
  return tweakConsonantPlanToBudget(rt, plan, targetConsonants, rand);
}

function generateSyllable(rt: GeneratorRuntime, context: WordGenerationContext, syllablePlan: SyllableShapePlan): Syllable {
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
    newSyllable.onset = pickOnset(rt, context, isStartOfWord, monosyllabic, syllablePlan.onsetLength);
  }

  newSyllable.nucleus = pickNucleus(rt, context, isStartOfWord, isEndOfWord);

  if (syllablePlan.codaLength > 0) {
    newSyllable.coda = pickCoda(rt, context, newSyllable, isEndOfWord, monosyllabic, syllablePlan.codaLength);
  }

  return newSyllable;
}

function generateSyllables(rt: GeneratorRuntime, context: WordGenerationContext, mode: GenerationMode) {
  if (!context.syllablePlans || context.syllablePlans.length === 0) {
    const forcedSyllableCount = context.syllableCount > 0 ? context.syllableCount : undefined;
    const targetPhonemeCount = sampleTargetPhonemeCount(rt, mode, context.rand, forcedSyllableCount);
    const sampledSyllableCount = sampleSyllableCountForTarget(rt, mode, targetPhonemeCount, context.rand, forcedSyllableCount);
    context.syllableCount = sampledSyllableCount;
    context.targetPhonemeCount = targetPhonemeCount;
    context.syllablePlans = distributePhonemes(rt, targetPhonemeCount, sampledSyllableCount, context.rand);
  }

  if (context.syllablePlans.length !== context.syllableCount) {
    throw new Error(`Top-down syllable plan mismatch: expected ${context.syllableCount}, got ${context.syllablePlans.length}`);
  }

  // Use context.word.syllables directly so generateSyllable can see
  // previous syllables (needed for OCP glide filtering in pickOnset).
  context.word.syllables = new Array(context.syllableCount);
  let prevSyllable: Syllable | undefined;

  for (let i = 0; i < context.syllableCount; i++) {
    const syllablePlan = context.syllablePlans[i];
    let newSyllable = generateSyllable(rt, context, syllablePlan);

    if (prevSyllable) {
      [prevSyllable, newSyllable] = adjustBoundary(rt, prevSyllable, newSyllable, context.rand, context.trace);
    }

    context.word.syllables[i] = newSyllable;
    prevSyllable = newSyllable;
    context.currSyllableIndex++;
  }

  const syllables = context.word.syllables;

  // Repair vowel hiatus: insert glide onset when two nuclei meet with no
  // intervening consonant (no coda on prev + no onset on current).
  repairVowelHiatus(rt, syllables);

  context.word.syllables = syllables;
}

/**
 * Insert a glide onset to break vowel hiatus at syllable boundaries.
 *
 * When two consecutive syllables have no consonant between them (prev has no
 * coda, current has no onset), a glide is inserted as the onset of the second
 * syllable: /j/ after front vowels, /w/ after back/round vowels, and /j/ as
 * the default for central vowels.
 */
function repairVowelHiatus(rt: GeneratorRuntime, syllables: Syllable[]): void {
  const jPhoneme = rt.config.phonemes.find(p => p.sound === "j");
  const wPhoneme = rt.config.phonemes.find(p => p.sound === "w");
  if (!jPhoneme || !wPhoneme) return;

  for (let i = 1; i < syllables.length; i++) {
    const prev = syllables[i - 1];
    const curr = syllables[i];

    if (prev.coda.length === 0 && curr.onset.length === 0) {
      // Pick glide based on the place of the preceding nucleus vowel
      const lastNucleus = prev.nucleus[prev.nucleus.length - 1];
      if (!lastNucleus) continue;

      // OCP: don't insert glides after any nucleus — the resulting
      // grapheme collisions (uw, iy, iw) look non-English regardless
      // of the vowel quality. Leave the hiatus unrepaired; adjacent
      // vowel graphemes across syllable boundaries are more natural
      // than phantom glide bigrams.
      continue;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * A word generator instance created from a {@link LanguageConfig}.
 */
export interface WordGenerator {
  /** Generate a single random word. */
  generateWord: (options?: WordGenerationOptions) => Word;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

/**
 * Resolve the RNG from generation options.
 *
 * Priority: `options.rand` > seeded RNG from `options.seed` > default (Math.random).
 * When both `rand` and `seed` are provided, `seed` is silently ignored.
 */
function resolveRng(options: WordGenerationOptions): RNG {
  return options.rand ?? (options.seed !== undefined ? createSeededRng(options.seed) : createDefaultRng());
}

/** Maximum retries for letter-length rejection sampling. */
const MAX_LENGTH_RETRIES = 3;
/** Maximum retries for top-down phoneme target matching. */
const MAX_TOPDOWN_RETRIES = 16;

function countPhonemes(syllables: Syllable[]): number {
  let total = 0;
  for (const syl of syllables) {
    total += syl.onset.length + syl.nucleus.length + syl.coda.length;
  }
  return total;
}

/**
 * Check whether a word's letter length passes rejection sampling
 * based on the syllable-count letter-length targets.
 *
 * - Within [peakMin, peakMax] → always accept
 * - Within [min, max] but outside peak → accept with 50% probability
 * - Outside [min, max] → always reject
 */
function acceptLetterLength(rt: GeneratorRuntime, context: WordGenerationContext): boolean {
  const targets = rt.config.syllableStructure.letterLengthTargets;
  if (!targets) return true;

  const bounds = targets[context.syllableCount];
  if (!bounds) return true;

  const [min, peakMin, peakMax, max] = bounds;
  const len = context.word.written.clean.length;

  if (len >= peakMin && len <= peakMax) return true;
  if (len >= min && len <= max) return context.rand() < 0.5;
  return false;
}

/**
 * Generate a single word with letter-length rejection sampling.
 *
 * Builds a fresh context on each attempt. After {@link MAX_LENGTH_RETRIES}
 * failed length checks, the last word is accepted unconditionally.
 */
function generateOneWord(
  rt: GeneratorRuntime,
  rand: RNG,
  mode: GenerationMode,
  syllableCount: number,
  applyMorph: boolean = false,
  enableTrace: boolean = false,
): Word {
  // Plan morphology before generating root (to adjust syllable count)
  const morphConfig = rt.config.morphology;
  const morphPlan = morphConfig?.enabled && applyMorph
    ? planMorphology(morphConfig, mode, rand)
    : undefined;

  // Guard: if "both" template would reduce root below 1 syllable, downgrade to single affix
  if (morphPlan && morphPlan.plan.template === "both" && syllableCount > 0) {
    const rootAfterReduction = syllableCount - morphPlan.syllableReduction;
    if (rootAfterReduction < 1) {
      // Drop prefix, keep suffix (more natural in English)
      if (morphPlan.plan.prefix) {
        morphPlan.syllableReduction -= morphPlan.plan.prefix.syllableCount;
        morphPlan.plan.prefix = undefined;
        morphPlan.plan.template = "suffixed";
      }
    }
  }

  const maxAttempts = MAX_LENGTH_RETRIES + MAX_TOPDOWN_RETRIES;
  let lastContext: WordGenerationContext | undefined;
  let lastTraceCollector: TraceCollector | undefined;
  let lastMorphApplied = false;

  // Adjust syllable count for affix syllables.
  let rootSyllableCount = syllableCount;
  if (morphPlan && morphPlan.syllableReduction > 0 && rootSyllableCount > 0) {
    rootSyllableCount = Math.max(1, rootSyllableCount - morphPlan.syllableReduction);
  }

  const forcedRootSyllableCount = rootSyllableCount > 0 ? rootSyllableCount : undefined;
  const targetPhonemeCount = sampleTargetPhonemeCount(rt, mode, rand, forcedRootSyllableCount);
  const sampledSyllableCount = sampleSyllableCountForTarget(rt, mode, targetPhonemeCount, rand, forcedRootSyllableCount);

  for (let attempt = 0; attempt <= maxAttempts; attempt++) {
    const syllablePlans = distributePhonemes(rt, targetPhonemeCount, sampledSyllableCount, rand);

    const traceCollector = enableTrace ? new TraceCollector() : undefined;
    if (traceCollector && morphPlan) {
      traceCollector.morphologyTrace = {
        template: morphPlan.plan.template,
        prefix: morphPlan.plan.prefix?.written,
        suffix: morphPlan.plan.suffix?.written,
        syllableReduction: morphPlan.syllableReduction,
      };
    }
    const context: WordGenerationContext = {
      rand,
      word: {
        syllables: [],
        pronunciation: "",
        written: { clean: "", hyphenated: "" },
      },
      syllableCount: sampledSyllableCount,
      currSyllableIndex: 0,
      targetPhonemeCount,
      syllablePlans,
      trace: traceCollector,
    };
    runPipeline(rt, context, mode);

    const rootPhonemeCount = countPhonemes(context.word.syllables);
    const phonemeTargetMatched = rootPhonemeCount === targetPhonemeCount;

    // Apply morphology after pipeline produces the bare root
    const morphApplied = !!morphPlan;
    if (morphPlan) {
      applyMorphology(rt, context, morphPlan.plan);
    }

    lastContext = context;
    lastTraceCollector = traceCollector;
    lastMorphApplied = morphApplied;

    const letterAccepted = attempt >= MAX_LENGTH_RETRIES || acceptLetterLength(rt, context);
    if (phonemeTargetMatched && letterAccepted) {
      if (traceCollector) {
        traceCollector.syllableCount = context.syllableCount;
        traceCollector.attempts = attempt;
        context.word.trace = traceCollector.toTrace(morphApplied);
      }
      return context.word;
    }
  }

  if (!lastContext) {
    throw new Error("Failed to generate word");
  }
  if (lastTraceCollector) {
    lastTraceCollector.syllableCount = lastContext.syllableCount;
    lastTraceCollector.attempts = maxAttempts;
    lastContext.word.trace = lastTraceCollector.toTrace(lastMorphApplied);
  }
  return lastContext.word;
}

/**
 * Shared pipeline: syllable generation → repair → write → pronounce.
 */
function runPipeline(rt: GeneratorRuntime, context: WordGenerationContext, mode: GenerationMode = "lexicon"): void {
  const t = context.trace;

  t?.beforeStage("generateSyllables", context.word.syllables);
  generateSyllables(rt, context, mode);
  t?.afterStage("generateSyllables", context.word.syllables);

  t?.beforeStage("repairClusters", context.word.syllables);
  if (rt.bannedSet) repairClusters(context.word.syllables, rt.bannedSet, rt.clusterRepair!, t);
  t?.afterStage("repairClusters", context.word.syllables);

  t?.beforeStage("repairFinalCoda", context.word.syllables);
  if (rt.allowedFinalSet) repairFinalCoda(context.word.syllables, rt.allowedFinalSet, t);
  t?.afterStage("repairFinalCoda", context.word.syllables);

  t?.beforeStage("repairClusterShape", context.word.syllables);
  if (rt.clusterLimits || rt.config.codaConstraints?.voicingAgreement || rt.config.codaConstraints?.homorganicNasalStop) {
    repairClusterShape(context.word.syllables, {
      clusterLimits: rt.clusterLimits,
      sonorityConstraints: rt.sonorityConstraints,
      codaConstraints: rt.config.codaConstraints,
      sonorityBySound: rt.sonorityBySound,
      codaAppendantSet: rt.codaAppendantSet,
      sonorityExemptSet: rt.sonorityExemptSet,
    }, t);
  }
  t?.afterStage("repairClusterShape", context.word.syllables);

  t?.beforeStage("repairHAfterBackVowel", context.word.syllables);
  repairHAfterBackVowel(context.word.syllables, t);
  t?.afterStage("repairHAfterBackVowel", context.word.syllables);

  const stressRules = rt.config.stress ?? { strategy: "weight-sensitive" };

  t?.beforeStage("applyStress", context.word.syllables);
  applyStress(context, stressRules);
  t?.afterStage("applyStress", context.word.syllables);

  t?.beforeStage("repairStressedNuclei", context.word.syllables);
  repairStressedNuclei(context, rt.positionPhonemes.nucleus, stressRules);
  t?.afterStage("repairStressedNuclei", context.word.syllables);

  t?.beforeStage("generateWrittenForm", context.word.syllables);
  rt.generateWrittenForm(context);
  t?.afterStage("generateWrittenForm", context.word.syllables);

  t?.beforeStage("generatePronunciation", context.word.syllables);
  generatePronunciation(context, rt.config.vowelReduction);
  t?.afterStage("generatePronunciation", context.word.syllables);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Creates a word generator from a {@link LanguageConfig}.
 *
 * All phoneme inventories, grapheme maps, sonority levels, and cluster
 * constraints are derived from the config at creation time — no global
 * state is referenced during generation.
 *
 *
 * @param config - The language configuration to build from.
 * @returns A {@link WordGenerator} instance.
 *
 * @example
 * ```ts
 * import { createGenerator, englishConfig } from "word-generator";
 *
 * const gen = createGenerator(englishConfig);
 * const word = gen.generateWord({ seed: 42 });
 * console.log(word.written.clean);
 * ```
 */
export function createGenerator(config: LanguageConfig): WordGenerator {
  const rt = buildRuntime(config);

  return {
    generateWord: (options: WordGenerationOptions = {}): Word => {
      return generateOneWord(rt, resolveRng(options), options.mode ?? "lexicon", options.syllableCount || 0, options.morphology ?? false, options.trace ?? false);
    },
  };
}

// ---------------------------------------------------------------------------
// Default English instance (built once, shared by public API + test helpers)
// ---------------------------------------------------------------------------

const defaultRuntime = buildRuntime(englishConfig);

/**
 * Generates a random English-like word. Shorthand for the default English generator.
 *
 * @example
 * ```ts
 * import { generateWord } from "word-generator";
 * const word = generateWord();
 * const affixed = generateWord({ morphology: true });
 * ```
 */
export const generateWord = (options: WordGenerationOptions = {}): Word => {
  return generateOneWord(defaultRuntime, resolveRng(options), options.mode ?? "lexicon", options.syllableCount || 0, options.morphology ?? false, options.trace ?? false);
};

/**
 * Generate multiple words sharing a single RNG instance.
 *
 * With a shared RNG, `generateWords(50, { seed: 42 })` is deterministic AND
 * produces different words for each index. This is **not** equivalent to
 * calling `generateWord({ seed: 42 })` 50 times — the latter creates 50
 * identical RNG streams and therefore 50 identical words.
 *
 * @param count - Number of words to generate.
 * @param options - Generation options (seed, rand, syllableCount, etc.).
 * @returns An array of generated {@link Word} objects.
 *
 * @example
 * ```ts
 * import { generateWords } from "word-generator";
 * const words = generateWords(50, { seed: 42 });
 * // All 50 words are different but fully deterministic.
 * const affixed = generateWords(50, { morphology: true });
 * ```
 */
export const generateWords = (count: number, options: WordGenerationOptions = {}): Word[] => {
  const rand = resolveRng(options);
  const mode = options.mode ?? "lexicon";
  const syllableCount = options.syllableCount || 0;
  const results: Word[] = [];
  for (let i = 0; i < count; i++) {
    results.push(generateOneWord(defaultRuntime, rand, mode, syllableCount, options.morphology ?? false, options.trace ?? false));
  }
  return results;
};

export default generateWord;

// ---------------------------------------------------------------------------
// Test helpers — exported for unit tests, not part of the public API
// ---------------------------------------------------------------------------

/** @internal Build a cluster using the default English runtime. For tests only. */
export function _buildCluster(context: ClusterContext): Phoneme[] {
  return buildCluster(defaultRuntime, context);
}

/** @internal Check cluster validity using the default English runtime. For tests only. */
export function _isValidCluster(cluster: Phoneme[], position: "onset" | "coda" | "nucleus"): boolean {
  return isValidCluster(defaultRuntime, cluster, position);
}

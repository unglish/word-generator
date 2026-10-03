import {
  computeSonorityLevels,
  expandClusterConstraintBans,
  type LanguageConfig,
  type SonorityConstraints,
} from "../config/language.js";
import type { Phoneme } from "../types.js";
import type { MorphophonemicGuardRuntime } from "./morphophonemic-guard.js";

interface ClusterRuntime extends MorphophonemicGuardRuntime {
  config: LanguageConfig;
  sonorityBySound: Map<string, number>;
  clusterRepair?: "drop-coda" | "drop-onset";
  sonorityConstraints?: SonorityConstraints;
  onsetPrependerSet?: Set<string>;
  sonorityExemptSet?: Set<string>;
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

/** Shared configuration preparation for generation and morphology evidence replay. */
export function buildClusterRuntime(config: LanguageConfig): ClusterRuntime {
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

  const bannedPairs = expandClusterConstraintBans(config);
  const bannedSet =
    bannedPairs.length > 0
      ? new Set(bannedPairs.map(([a, b]) => `${a}|${b}`))
      : undefined;

  const sonorityBySound = new Map<string, number>();
  const phonemeBySound = new Map<string, Phoneme>();
  for (const [phoneme, level] of sonorityLevels) {
    sonorityBySound.set(phoneme.sound, level);
    phonemeBySound.set(phoneme.sound, phoneme);
  }

  const cl = config.clusterLimits;
  const sc = config.sonorityConstraints;

  // Build cluster weight maps from config
  const clusterWeights = config.clusterWeights
    ? {
      onset: config.clusterWeights.onset
        ? new Map(Object.entries(config.clusterWeights.onset))
        : undefined,
      coda: config.clusterWeights.coda
        ? // Check if position-based format (has 'final' or 'nonFinal' keys)
        typeof config.clusterWeights.coda === "object" &&
            ("final" in config.clusterWeights.coda ||
              "nonFinal" in config.clusterWeights.coda)
          ? {
            final: config.clusterWeights.coda.final
              ? new Map(Object.entries(config.clusterWeights.coda.final))
              : undefined,
            nonFinal: config.clusterWeights.coda.nonFinal
              ? new Map(Object.entries(config.clusterWeights.coda.nonFinal))
              : undefined,
          }
          : new Map(
            Object.entries(
                  config.clusterWeights.coda as Record<string, number>,
            ),
          )
        : undefined,
    }
    : undefined;

  // Build banned nucleus+coda map for efficient lookup during coda selection
  const bannedNucleusCodaMap = config.codaConstraints
    ?.bannedNucleusCodaCombinations
    ? (() => {
      const map = new Map<string, Set<string>>();
      for (const { nucleus, coda } of config.codaConstraints
        .bannedNucleusCodaCombinations) {
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
    config,
    sonorityLevels,
    sonorityBySound,
    phonemeBySound,
    positionPhonemes,
    invalidClusterRegexes,
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
    codaAppendantSet: cl?.codaAppendants
      ? new Set(cl.codaAppendants)
      : undefined,
    onsetPrependerSet: cl?.onsetPrependers
      ? new Set(cl.onsetPrependers)
      : undefined,
    sonorityExemptSet: sc?.exempt ? new Set(sc.exempt) : undefined,
    attestedOnsetSet: cl?.attestedOnsets
      ? new Set(cl.attestedOnsets.map((a) => a.join("|")))
      : undefined,
    attestedCodaSet: cl?.attestedCodas
      ? new Set(cl.attestedCodas.map((a) => a.join("|")))
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

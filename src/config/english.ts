import { LanguageConfig } from "./language.js";
import { englishClusterConstraint, englishCodaConstraints } from "../core/repair.js";
import {
  VOICED_BONUS,
  TENSE_BONUS,
  SYLLABLE_COUNT_WEIGHTS,
  ONSET_LENGTH_MONOSYLLABIC,
  ONSET_LENGTH_FOLLOWING_NUCLEUS,
  ONSET_LENGTH_DEFAULT,
  CODA_LENGTH_MONOSYLLABIC,
  CODA_LENGTH_MONOSYLLABIC_DEFAULT,
  CODA_ZERO_WEIGHT_END_OF_WORD,
  CODA_ZERO_WEIGHT_MID_WORD,
  CODA_LENGTH_POLYSYLLABIC_NONZERO,
  FINAL_S_CHANCE,
  BOUNDARY_DROP_CHANCE,
  HAS_ONSET_START_OF_WORD,
  HAS_ONSET_AFTER_CODA,
  HAS_CODA_MONOSYLLABIC,
  HAS_CODA_END_OF_WORD,
  HAS_CODA_MID_WORD,
} from "./weights.js";
import {
  phonemes,
  phonemeMaps,
  sonorityToMannerOfArticulation,
  sonorityToPlaceOfArticulation,
  invalidOnsetClusters,
  invalidCodaClusters,
  invalidBoundaryClusters,
} from "../elements/phonemes.js";
import { graphemes, graphemeMaps } from "../elements/graphemes/index.js";

/**
 * English language configuration built from existing phoneme/grapheme data.
 * Consumed by {@link createGenerator} to produce the default English word generator.
 */
export const englishConfig: LanguageConfig = {
  id: "en",
  name: "English",

  phonemes,
  phonemeMaps,

  graphemes,
  graphemeMaps,

  invalidClusters: {
    onset: invalidOnsetClusters.map(r => r.source),
    coda: invalidCodaClusters.map(r => r.source),
    boundary: invalidBoundaryClusters.map(r => r.source),
  },

  sonorityHierarchy: {
    mannerOfArticulation: sonorityToMannerOfArticulation,
    placeOfArticulation: sonorityToPlaceOfArticulation,
    voicedBonus: VOICED_BONUS,
    tenseBonus: TENSE_BONUS,
  },

  syllableStructure: {
    maxOnsetLength: 3,
    maxCodaLength: 4,
    maxNucleusLength: 1,
    syllableCountWeights: SYLLABLE_COUNT_WEIGHTS,
  },

  generationWeights: {
    onsetLength: {
      monosyllabic: ONSET_LENGTH_MONOSYLLABIC,
      followingNucleus: ONSET_LENGTH_FOLLOWING_NUCLEUS,
      default: ONSET_LENGTH_DEFAULT,
    },
    codaLength: {
      monosyllabic: CODA_LENGTH_MONOSYLLABIC,
      monosyllabicDefault: CODA_LENGTH_MONOSYLLABIC_DEFAULT,
      polysyllabicNonzero: CODA_LENGTH_POLYSYLLABIC_NONZERO,
      zeroWeightEndOfWord: CODA_ZERO_WEIGHT_END_OF_WORD,
      zeroWeightMidWord: CODA_ZERO_WEIGHT_MID_WORD,
    },
    probability: {
      hasOnsetStartOfWord: HAS_ONSET_START_OF_WORD,
      hasOnsetAfterCoda: HAS_ONSET_AFTER_CODA,
      hasCodaMonosyllabic: HAS_CODA_MONOSYLLABIC,
      hasCodaEndOfWord: HAS_CODA_END_OF_WORD,
      hasCodaMidWord: HAS_CODA_MID_WORD,
      finalS: FINAL_S_CHANCE,
      boundaryDrop: BOUNDARY_DROP_CHANCE,
    },
  },

  stress: {
    strategy: "weight-sensitive",
  },

  doubling: {
    enabled: true,
    trigger: "lax-vowel",
    probability: 80,
    maxPerWord: 1,
    neverDouble: ["v", "w", "j", "h", "ŋ", "θ", "ð", "ʒ", "k"],
    finalDoublingOnly: ["f", "s", "l", "z"],
    suppressAfterReduction: true,
    suppressBeforeTense: true,
    unstressedModifier: 0.5,
  },

  spellingRules: [
    {
      name: "magic-e",
      pattern: "([aiouy])e([bcdfghjklmnpqrstvwxyz])$",
      replacement: "$1$2e",
      probability: 98,
      scope: "syllable",
    },
    {
      name: "ks-to-x",
      pattern: "(?<!^)ks",
      replacement: "x",
      probability: 25,
    },
    {
      name: "hard-c-before-front-vowel",
      pattern: "c([eiy])",
      replacement: "k$1",
      probability: 100,
      scope: "word",
    },
    {
      name: "no-final-v",
      pattern: "v$",
      replacement: "ve",
      probability: 95,
      scope: "word",
    },
    {
      name: "no-final-j",
      pattern: "j$",
      replacement: "ge",
      probability: 95,
      scope: "word",
    },
    {
      name: "no-final-i",
      pattern: "i$",
      replacement: "y",
      probability: 95,
      scope: "word",
    },
  ],

  clusterConstraint: englishClusterConstraint,
  codaConstraints: englishCodaConstraints,

  vowelReduction: {
    enabled: true,
    rules: [
      { source: "ʌ", target: "ə", probability: 85 },
      { source: "ɛ", target: "ɪ", probability: 70 },
      { source: "e", target: "ɪ", probability: 70 },
      { source: "ɑ", target: "ə", probability: 65 },
      { source: "ɔ", target: "ə", probability: 60 },
      { source: "æ", target: "ə", probability: 40 },
      { source: "o", target: "ə", probability: 55 },
      { source: "ɜ", target: "ə", probability: 75 },
    ],
    reduceSecondaryStress: true,
    secondaryStressProbability: 30,
    positionalModifiers: {
      wordInitial: 0.70,
      wordMedial: 1.0,
      wordFinal: 0.50,
    },
  },
};

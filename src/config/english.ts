import { LanguageConfig } from "./language.js";
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
 * Proves the LanguageConfig interface fits the current English data.
 *
 * TODO: wire into generate.ts once it accepts LanguageConfig (#24)
 */
export const englishConfig: LanguageConfig = {
  id: "en",
  name: "English",

  phonemes,
  phonemeMaps,

  graphemes,
  graphemeMaps,

  invalidClusters: {
    onset: invalidOnsetClusters,
    coda: invalidCodaClusters,
    boundary: invalidBoundaryClusters,
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
};

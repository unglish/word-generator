import { LanguageConfig, computeSonorityLevels } from "./language.js";
import { VOICED_BONUS, TENSE_BONUS, SYLLABLE_COUNT_WEIGHTS } from "./weights.js";
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

  stress: {
    strategy: "weight-sensitive",
  },
};

import { LanguageConfig } from "./language.js";
import {
  phonemes,
  phonemeMaps,
  sonorityLevels,
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
    voicedBonus: 0.5,
    tenseBonus: 0.25,
  },
  sonorityLevels,

  syllableStructure: {
    maxOnsetLength: 3,
    maxCodaLength: 4,
    maxNucleusLength: 1,
    syllableCountWeights: [
      [1, 5000],
      [2, 30000],
      [3, 29700],
      [4, 3000],
      [5, 200],
      [6, 50],
      [7, 5],
    ],
  },

  stress: {
    strategy: "weight-sensitive",
  },
};

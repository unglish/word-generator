import { Phoneme, Grapheme, Word, WordGenerationOptions } from "../types.js";

/**
 * Sonority hierarchy mapping: manner of articulation to sonority value.
 * Higher values = more sonorous (vowels highest, stops lowest).
 */
export interface SonorityHierarchy {
  mannerOfArticulation: Record<string, number>;
  placeOfArticulation: Record<string, number>;
  voicedBonus: number;
  tenseBonus: number;
}

/**
 * Syllable structure rules controlling how syllables are built.
 */
export interface SyllableStructureRules {
  /** Maximum number of phonemes in an onset cluster */
  maxOnsetLength: number;
  /** Maximum number of phonemes in a coda cluster */
  maxCodaLength: number;
  /** Maximum number of phonemes in a nucleus */
  maxNucleusLength: number;
  /** Weighted distribution of syllable counts: [count, weight][] */
  syllableCountWeights: [number, number][];
}

/**
 * Stress assignment rules for polysyllabic words.
 */
export interface StressRules {
  /** Strategy for assigning primary stress */
  strategy: "fixed" | "weight-sensitive" | "penultimate" | "initial" | "custom";
  /** For fixed strategy: 0-indexed syllable that receives primary stress */
  fixedPosition?: number;
}

/**
 * Complete language configuration capturing the phonological system
 * needed to generate words in a given language.
 */
export interface LanguageConfig {
  /** Language identifier (e.g., "en", "es", "fr") */
  id: string;
  /** Human-readable language name */
  name: string;

  /** Full phoneme inventory for this language */
  phonemes: Phoneme[];
  /** Phonemes grouped by syllable position */
  phonemeMaps: {
    onset: Map<string, Phoneme[]>;
    nucleus: Map<string, Phoneme[]>;
    coda: Map<string, Phoneme[]>;
  };

  /** Grapheme (spelling) mappings for each phoneme */
  graphemes: Grapheme[];
  /** Graphemes grouped by syllable position */
  graphemeMaps: {
    onset: Map<string, Grapheme[]>;
    nucleus: Map<string, Grapheme[]>;
    coda: Map<string, Grapheme[]>;
  };

  /** Phonotactic constraints: regex patterns for invalid clusters */
  invalidClusters: {
    onset: RegExp[];
    coda: RegExp[];
    boundary: RegExp[];
  };

  /** Sonority hierarchy used for cluster validation */
  sonorityHierarchy: SonorityHierarchy;
  /** Pre-computed sonority levels per phoneme */
  sonorityLevels: Map<Phoneme, number>;

  /** Rules governing syllable structure */
  syllableStructure: SyllableStructureRules;

  /** Stress assignment rules */
  stress: StressRules;
}

/**
 * Factory function type for creating a word generator from a language config.
 * The actual implementation will come in a future PR.
 */
export type CreateWordGenerator = (config: LanguageConfig) => {
  generateWord: (options?: WordGenerationOptions) => Word;
};

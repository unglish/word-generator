import { Phoneme, Grapheme } from "../types.js";

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
 *
 * Currently only `"weight-sensitive"` is implemented.
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
 *
 * `sonorityLevels` is intentionally excluded — it is derived data that
 * should be computed from the `sonorityHierarchy` and `phonemes` using
 * {@link computeSonorityLevels} to guarantee consistency.
 */
export interface LanguageConfig {
  /** Language identifier (e.g., "en", "es", "fr") */
  id: string;
  /** Human-readable language name */
  name: string;

  /** Full phoneme inventory for this language */
  phonemes: Phoneme[];
  /**
   * Phonemes grouped by syllable position.
   * Keys are IPA symbols (e.g., "p", "æ"); values are all Phoneme
   * objects matching that sound in the given position.
   */
  phonemeMaps: {
    onset: Map<string, Phoneme[]>;
    nucleus: Map<string, Phoneme[]>;
    coda: Map<string, Phoneme[]>;
  };

  /** Grapheme (spelling) mappings for each phoneme */
  graphemes: Grapheme[];
  /**
   * Graphemes grouped by syllable position.
   * Keys are IPA phoneme symbols; values are all Grapheme spelling
   * options for that phoneme in the given position.
   */
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

  /** Rules governing syllable structure */
  syllableStructure: SyllableStructureRules;

  /** Stress assignment rules */
  stress: StressRules;
}

/**
 * Compute sonority levels for every phoneme from the language config's
 * sonority hierarchy. This guarantees levels stay consistent with the
 * hierarchy — no stale cache possible.
 */
export function computeSonorityLevels(config: LanguageConfig): Map<Phoneme, number> {
  const { mannerOfArticulation, placeOfArticulation, voicedBonus, tenseBonus } =
    config.sonorityHierarchy;

  return new Map(
    config.phonemes.map((p) => [
      p,
      (mannerOfArticulation[p.mannerOfArticulation] ?? 0) +
        (placeOfArticulation[p.placeOfArticulation] ?? 0) +
        (p.voiced ? voicedBonus : 0) +
        (p.tense ? tenseBonus : 0),
    ]),
  );
}

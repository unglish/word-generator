import { Phoneme, Grapheme } from "../types.js";

// ---------------------------------------------------------------------------
// Reusable positional type
// ---------------------------------------------------------------------------

/** Data keyed by syllable position. */
export type ByPosition<T> = { onset: T; nucleus: T; coda: T };

// ---------------------------------------------------------------------------
// Derived articulation types (from Phoneme)
// ---------------------------------------------------------------------------

/** Manner of articulation values, derived from the Phoneme union. */
export type MannerOfArticulation = Phoneme["mannerOfArticulation"];

/** Place of articulation values, derived from the Phoneme union. */
export type PlaceOfArticulation = Phoneme["placeOfArticulation"];

// ---------------------------------------------------------------------------
// Sub-interfaces
// ---------------------------------------------------------------------------

/**
 * Sonority hierarchy mapping: manner/place of articulation to sonority value.
 * Higher values = more sonorous (vowels highest, stops lowest).
 *
 * Keys are type-checked against the Phoneme articulation unions, so typos
 * like `"fircative"` are caught at compile time. `Partial` because not
 * every language uses every articulation category.
 */
export interface SonorityHierarchy {
  mannerOfArticulation: Partial<Record<MannerOfArticulation, number>>;
  placeOfArticulation: Partial<Record<PlaceOfArticulation, number>>;
  voicedBonus: number;
  tenseBonus: number;
}

/**
 * Syllable structure rules controlling how syllables are built.
 */
export interface SyllableStructureRules {
  /** Maximum onset cluster length (English: 3, e.g. /str-/ in "strong"). */
  maxOnsetLength: number;
  /** Maximum coda cluster length (English: 4, e.g. /-lpts/ in "sculpts"). */
  maxCodaLength: number;
  /** Maximum nucleus length (English: 1 — no complex nuclei). */
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

// ---------------------------------------------------------------------------
// Main interface
// ---------------------------------------------------------------------------

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
  phonemeMaps: ByPosition<Map<string, Phoneme[]>>;

  /** Grapheme (spelling) mappings for each phoneme */
  graphemes: Grapheme[];
  /**
   * Graphemes grouped by syllable position.
   * Keys are IPA phoneme symbols; values are all Grapheme spelling
   * options for that phoneme in the given position.
   */
  graphemeMaps: ByPosition<Map<string, Grapheme[]>>;

  /**
   * Phonotactic constraints: regex patterns for invalid clusters.
   * Uses `boundary` (cross-syllable) rather than `nucleus` since nuclei
   * are not cluster-constrained.
   */
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

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

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

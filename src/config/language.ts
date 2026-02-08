import { Phoneme, Grapheme } from "../types.js";

// ---------------------------------------------------------------------------
// Reusable positional type
// ---------------------------------------------------------------------------

/** Data keyed by syllable position (onset / nucleus / coda). */
export type BySyllablePosition<T> = { onset: T; nucleus: T; coda: T };

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
  /**
   * Sonority adjustment by place of articulation.
   *
   * Note: this combines vowel position (front / central / back) and
   * consonant place of articulation (bilabial, alveolar, …) into a
   * single map. Linguistically these are different dimensions, but for
   * sonority scoring a unified numeric adjustment works well enough.
   */
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
 * Weighted probability tables controlling how syllable components are sized
 * and whether they appear at all. These are the "generation heuristics" that
 * shape how words *feel* — independent of the phoneme/grapheme inventory.
 */
export interface GenerationWeights {
  /** Onset length distributions: [lengthValue, weight][] */
  onsetLength: {
    /** Weights when the word is monosyllabic. */
    monosyllabic: [number, number][];
    /** Weights when the previous syllable had no coda (hiatus avoidance). */
    followingNucleus: [number, number][];
    /** Default weights for polysyllabic onsets. */
    default: [number, number][];
  };

  /** Coda length distributions */
  codaLength: {
    /** Monosyllabic coda weights keyed by onset length. */
    monosyllabic: Record<number, [number, number][]>;
    /** Fallback for monosyllabic codas when onset length isn't in the map. */
    monosyllabicDefault: [number, number][];
    /** Non-zero coda length weights for polysyllabic words. */
    polysyllabicNonzero: [number, number][];
    /** Weight for zero-length coda when it's the last syllable. */
    zeroWeightEndOfWord: number;
    /** Weight for zero-length coda mid-word. */
    zeroWeightMidWord: number;
  };

  /** Percentage chances (0–100) controlling structural decisions. */
  probability: {
    /** Chance the first syllable has an onset. */
    hasOnsetStartOfWord: number;
    /** Chance a non-initial syllable has an onset when the previous has a coda. */
    hasOnsetAfterCoda: number;
    /** Chance a monosyllabic word has a coda. */
    hasCodaMonosyllabic: number;
    /** Chance the final syllable has a coda. */
    hasCodaEndOfWord: number;
    /** Chance a mid-word syllable has a coda. */
    hasCodaMidWord: number;
    /** Chance to append a final 's' phoneme. */
    finalS: number;
    /** Chance to drop a coda phoneme at a syllable boundary with equal sonority. */
    boundaryDrop: number;
  };
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

  /**
   * Full phoneme inventory for this language.
   *
   * **Invariant:** must equal the union of all values in {@link phonemeMaps}.
   * Both are kept for ergonomics — flat iteration vs. positional lookup.
   */
  phonemes: Phoneme[];
  /**
   * Phonemes grouped by syllable position.
   * Keys are IPA symbols (e.g., "p", "æ"); values are all Phoneme
   * objects matching that sound in the given position.
   */
  phonemeMaps: BySyllablePosition<Map<string, Phoneme[]>>;

  /** Grapheme (spelling) mappings for each phoneme */
  graphemes: Grapheme[];
  /**
   * Graphemes grouped by syllable position.
   * Keys are IPA phoneme symbols; values are all Grapheme spelling
   * options for that phoneme in the given position.
   */
  graphemeMaps: BySyllablePosition<Map<string, Grapheme[]>>;

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

  /** Weighted probability tables for generation heuristics. */
  generationWeights: GenerationWeights;

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

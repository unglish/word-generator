import { Phoneme, Grapheme } from "../types.js";
// ---------------------------------------------------------------------------
// Repair constraint types
// ---------------------------------------------------------------------------

export interface ClusterConstraint {
  /** [coda sound, onset sound] pairs that are illegal across syllable boundaries. */
  banned?: [string, string][];
  /** How to repair a banned cluster. */
  repair: "drop-coda" | "drop-onset";
}

export interface CodaConstraints {
  /** Phoneme sounds allowed in word-final position. Unlisted phonemes are dropped. */
  allowedFinal?: string[];
  /** Phoneme sounds that must never appear in coda position (any syllable). */
  bannedCodas?: string[];
  /** Require voicing agreement among obstruents in coda clusters. */
  voicingAgreement?: boolean;
  /** Require nasal+stop to agree in place of articulation. */
  homorganicNasalStop?: boolean;
}

export interface ClusterLimits {
  /** Max phonemes in an onset cluster (English: 3 — /s/ + stop + liquid). */
  maxOnset: number;
  /** Max phonemes in a coda cluster (English: 3, or 4 with trailing /s/). */
  maxCoda: number;
  /** Phonemes that can extend coda beyond maxCoda (English: ["s", "z"]). */
  codaAppendants?: string[];
  /** Phonemes that can extend onset beyond normal limits as a prefix (English: ["s"]). */
  onsetPrependers?: string[];
  /** If provided, multi-consonant onsets must match an entry. Overrides pure SSP. */
  attestedOnsets?: string[][];
  /** If provided, multi-consonant codas must match an entry or prefix of one. */
  attestedCodas?: string[][];
}

export interface SonorityConstraints {
  /** Require rising sonority in onsets (English: true). */
  risingOnset: boolean;
  /** Require falling sonority in codas (English: true). */
  fallingCoda: boolean;
  /** Minimum sonority distance between adjacent cluster members (0 = equal OK). */
  minSonorityGap?: number;
  /** Phonemes exempt from sequencing (e.g. /s/ can violate sonority in "st-", "-ks"). */
  exempt?: string[];
}

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
  /** Syllable count weights for "text" mode. Falls back to syllableCountWeights. */
  syllableCountWeightsText?: [number, number][];
  /** Syllable count weights for "lexicon" mode. Falls back to syllableCountWeights. */
  syllableCountWeightsLexicon?: [number, number][];
  /** Letter-length targets per syllable count: [min, peak_min, peak_max, max]. */
  letterLengthTargets?: Record<number, [number, number, number, number]>;
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
 * Note: `pronounce.ts` does not yet read this config — stress and
 * aspiration logic is still English-specific. See issue #35.
 */
export interface StressRules {
  /** Strategy for assigning primary stress */
  strategy: "fixed" | "weight-sensitive" | "penultimate" | "initial" | "custom";
  /** For fixed strategy: 0-indexed syllable that receives primary stress */
  fixedPosition?: number;

  // -- Primary stress --

  /** [firstSyllableWeight, secondSyllableWeight] for disyllabic words. Default: [70, 30]. */
  disyllabicWeights?: [number, number];
  /** Polysyllabic primary-stress weights by penultimate syllable weight. */
  polysyllabicWeights?: {
    /** Weight for penultimate when it is heavy. Default: 70. */
    heavyPenult: number;
    /** Weight for penultimate when it is light. Default: 30. */
    lightPenult: number;
    /** Weight for antepenultimate when penult is heavy. Default: 20. */
    antepenultHeavy: number;
    /** Weight for antepenultimate when penult is light. Default: 60. */
    antepenultLight: number;
    /** Weight for initial syllable (fallback). Default: 10. */
    initial: number;
  };

  // -- Secondary stress --

  /** Probability (0-100) of assigning secondary stress. Default: 40. */
  secondaryStressProbability?: number;
  /** Weight for heavy syllable candidates for secondary stress. Default: 70. */
  secondaryStressHeavyWeight?: number;
  /** Weight for light syllable candidates for secondary stress. Default: 30. */
  secondaryStressLightWeight?: number;

  // -- Rhythmic stress --

  /** Probability (0-100) of assigning rhythmic secondary stress. Default: 40. */
  rhythmicStressProbability?: number;

  // -- Nucleus interaction (PR C) --

  /** Phoneme sounds banned in stressed nuclei (e.g. ["ə"]). */
  stressedNucleusBan?: string[];
  /** Weight boosts for unstressed nuclei (e.g. {"ə": 3}). */
  unstressedNucleusBoost?: Record<string, number>;
}

/**
 * A single vowel-reduction mapping: source vowel → target reduced vowel
 * with an associated probability.
 */
export interface VowelReductionRule {
  /** Source vowel IPA symbol */
  source: string;
  /** Target reduced vowel IPA symbol */
  target: string;
  /** Reduction probability 0-100 */
  probability: number;
}

/**
 * Configuration for vowel reduction in unstressed syllables.
 *
 * Stress-timed languages (e.g. English) reduce unstressed vowels toward
 * a central vowel (typically schwa /ə/).  Tense vowels and diphthongs
 * resist reduction more than lax monophthongs.
 */
export interface VowelReductionConfig {
  /** Whether vowel reduction is enabled at all. */
  enabled: boolean;
  /** Per-vowel reduction rules. Vowels not listed are immune. */
  rules: VowelReductionRule[];
  /** Whether secondary-stressed syllables can reduce */
  reduceSecondaryStress: boolean;
  /** Probability multiplier for secondary stress (0-100), applied on top of per-vowel probability */
  secondaryStressProbability?: number;
  /** Positional probability multipliers (0.0-1.0) */
  positionalModifiers?: {
    wordInitial?: number;
    wordMedial?: number;
    wordFinal?: number;
  };
}

// ---------------------------------------------------------------------------
// Doubling & Spelling Rules
// ---------------------------------------------------------------------------

/**
 * Language-level consonant doubling strategy.
 * Controls how a language signals vowel length/quality through consonant spelling.
 */
export interface DoublingConfig {
  /** Master switch. */
  enabled: boolean;
  /** What triggers doubling. */
  trigger: "lax-vowel" | "gemination" | "none";
  /** Base probability (0-100) when trigger condition is met. */
  probability: number;
  /** Max doubled consonants per word. */
  maxPerWord: number;
  /** IPA sounds that never double. */
  neverDouble: string[];
  /** Word-final doubling restricted to these sounds only. */
  finalDoublingOnly?: string[];
  /** Suppress doubling after vowels that were reduced (schwa substitution). */
  suppressAfterReduction: boolean;
  /** Suppress doubling when the next nucleus is tense or a diphthong. */
  suppressBeforeTense: boolean;
  /** Probability modifier for unstressed syllable context (0.0-1.0). */
  unstressedModifier?: number;
}

/**
 * A single vowel-grapheme swap for the silent-e rule.
 * When a word ends in a single consonant grapheme preceded by a long vowel,
 * the vowel's "long" grapheme can be replaced with its "short" form and a
 * silent 'e' appended to signal the long pronunciation.
 */
export interface SilentESwap {
  /** IPA phoneme sound this swap applies to (e.g. "eɪ", "i:", "aɪ"). */
  phoneme: string;
  /** The "long" grapheme form to look for (e.g. "ai", "ee", "igh"). */
  from: string;
  /** The "short" replacement form (e.g. "a", "e", "i"). */
  to: string;
}

/**
 * Configuration for the silent-e (magic-e / split digraph) spelling pattern.
 *
 * When enabled, word-final VCe patterns are created by replacing a long-vowel
 * grapheme with its short counterpart and appending silent 'e'. This only
 * applies when the word ends in a single consonant grapheme.
 */
/**
 * A consonant sound that always receives a trailing silent-e word-finally,
 * regardless of the preceding vowel's length (orthographic convention).
 * E.g. English words never end in bare 'v': "give", "love", "have".
 */
export interface SilentEAppendRule {
  /** IPA consonant sound (e.g. "v", "z"). */
  sound: string;
  /** Probability (0-100) of appending silent-e when this sound is word-final. */
  probability: number;
}

export interface SilentEConfig {
  /** Master switch. */
  enabled: boolean;
  /** Probability (0-100) of applying when the pattern is eligible. */
  probability: number;
  /** Vowel grapheme swaps that define eligible patterns. */
  swaps: SilentESwap[];
  /**
   * Consonant sounds (IPA) where silent-e should NOT be applied.
   * E.g. /w/, /h/, /j/ — English never uses silent-e after these.
   */
  excludedCodas?: string[];
  /**
   * Consonant sounds where silent-e is always appended word-finally,
   * regardless of vowel length. This is purely orthographic — the vowel
   * sound doesn't change. E.g. English "v" → "give", "love", "have".
   */
  appendAfter?: SilentEAppendRule[];
}

/**
 * A post-selection spelling rule (regex-based transformation on written output).
 */
export interface SpellingRule {
  /** Human-readable name for debugging. */
  name: string;
  /** Regex pattern to match in the written form. */
  pattern: string;
  /** Regex flags (default: "g"). */
  flags?: string;
  /** Replacement string (can use $1, $2 capture groups). */
  replacement: string;
  /** Probability (0-100) of applying when matched. Default: 100. */
  probability?: number;
  /** When to apply: "syllable" (per-syllable), "word" (full word), or "both" (default). */
  scope?: "syllable" | "word" | "both";
}

// ---------------------------------------------------------------------------
// Written-form constraints
// ---------------------------------------------------------------------------

export interface WrittenFormConstraints {
  /**
   * Max consecutive consonant grapheme units allowed. Default: 4.
   *
   * Multi-letter graphemes (e.g. "ch", "sh", "tch") count as a single unit.
   * For example, "tchstr" tokenizes to ["tch", "s", "t", "r"] = 4 units.
   */
  maxConsonantGraphemes?: number;

  /**
   * Consonant digraphs/trigraphs treated as atomic grapheme units.
   * Longest-match-first during tokenization. Order matters: longer entries first.
   * Default for English: ["tch", "dge", "ch", "sh", "th", "ng", "ph", "wh", "ck"]
   */
  consonantGraphemes?: string[];

  /**
   * Max consecutive raw consonant *letters* (not grapheme units) allowed.
   * Applied as a second pass after grapheme-aware repair.
   */
  maxConsonantLetters?: number;

  /**
   * Max consecutive consonant letters allowed at the end of a word.
   * Applied after general consonant repairs. Trims from the interior
   * of the final consonant cluster. Default: no limit.
   */
  maxFinalConsonantLetters?: number;

  /**
   * Max consecutive vowel *letters* (a, e, i, o, u, y) allowed.
   * Applied after consonant repairs. Default: no limit.
   */
  maxVowelLetters?: number;
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
   * Phonotactic constraints: patterns for invalid clusters.
   * Each entry is a regex source string (e.g. `"sr"`, `"ʃh"`).
   * Stored as strings for JSON-serializability; compiled to RegExp at
   * runtime by {@link buildRuntime} in the generator.
   *
   * Uses `boundary` (cross-syllable) rather than `nucleus` since nuclei
   * are not cluster-constrained.
   */
  invalidClusters: {
    onset: string[];
    coda: string[];
    boundary: string[];
  };

  /** Sonority hierarchy used for cluster validation */
  sonorityHierarchy: SonorityHierarchy;

  /** Rules governing syllable structure */
  syllableStructure: SyllableStructureRules;

  /** Weighted probability tables for generation heuristics. */
  generationWeights: GenerationWeights;

  /** Stress assignment rules */
  stress: StressRules;

  /**
   * Vowel reduction settings for unstressed syllables.
   *
   * In stress-timed languages like English, unstressed vowels tend to
   * reduce toward schwa /ə/. This config controls that behaviour.
   */
  vowelReduction?: VowelReductionConfig;

  /** Consonant doubling strategy. */
  doubling?: DoublingConfig;

  /** Silent-e (magic-e / split digraph) configuration. */
  silentE?: SilentEConfig;

  /** Post-selection spelling adjustments. */
  spellingRules?: SpellingRule[];

  /** Cross-syllable consonant cluster repair constraints. */
  clusterConstraint?: ClusterConstraint;

  /** Word-final coda repair constraints. */
  codaConstraints?: CodaConstraints;

  /** Feature-based cluster length and shape constraints. */
  clusterLimits?: ClusterLimits;

  /** Feature-based sonority sequencing constraints. */
  sonorityConstraints?: SonorityConstraints;

  /** Written-form readability constraints. */
  writtenFormConstraints?: WrittenFormConstraints;

  /** Morphological word-formation configuration. */
  morphology?: MorphologyConfig;
}

// ---------------------------------------------------------------------------
// Morphology types
// ---------------------------------------------------------------------------

/** Explicit syllable template for an affix phoneme sequence. */
export interface AffixSyllable {
  onset: string[];   // phoneme sounds
  nucleus: string[]; // phoneme sounds
  coda: string[];    // phoneme sounds
}

/** Orthographic transform applied at affix\u2194root junctions. */
export interface BoundaryTransform {
  /** Human-readable name for this rule. */
  name: string;
  /** Regex to test against the root's written form (for suffixes) or reversed form (for prefixes). */
  match: RegExp;
  /** Replacement string (passed to String.replace). */
  replace: string;
  /** Names of other transforms that, if they fired, block this one. */
  blockedBy?: string[];
}

/** Phonological condition for allomorph selection. */
export interface PhonologicalCondition {
  /** Which phoneme to test: the one adjacent to the affix boundary. */
  position: 'preceding' | 'following';
  /** If set, phoneme.voiced must match this value. */
  voiced?: boolean;
  /** If set, phoneme.mannerOfArticulation must be one of these. */
  manner?: string[];
  /** If set, phoneme.placeOfArticulation must be one of these. */
  place?: string[];
}

/** A single allomorphic variant of an affix. */
export interface AllomorphVariant {
  /** Config-driven phonological condition. */
  phonologicalCondition: PhonologicalCondition;
  /** Phoneme sequence for this variant. */
  phonemes: string[];
  /** Explicit syllable structure for this variant. */
  syllables?: AffixSyllable[];
  /** Number of syllables this variant adds. */
  syllableCount: number;
  /** Written form if different from the base affix (e.g. "-es" vs "-s"). */
  written?: string;
}

/** A morphological affix (prefix or suffix). */
export interface Affix {
  /** Whether this attaches before or after the root. */
  type: 'prefix' | 'suffix';
  /** Written form (e.g. "ing", "tion", "un", "re"). */
  written: string;
  /** Default phoneme sequence (IPA sound strings matching phonemes in the inventory). */
  phonemes: string[];
  /** Explicit syllable structure for this affix. */
  syllables?: AffixSyllable[];
  /** Number of syllables this affix adds. */
  syllableCount: number;
  /** How this affix affects stress placement. */
  stressEffect: 'none' | 'attract-preceding' | 'primary' | 'secondary';
  /** Relative frequency weight for selection. */
  frequency: number;
  /** Config-driven boundary transforms applied at affix\u2194root junctions. */
  boundaryTransforms?: BoundaryTransform[];
  /** Allomorphic variants selected by root-final context. If present, overrides base phonemes/syllableCount. */
  allomorphs?: AllomorphVariant[];
}

/** Configuration for morphological word formation. */
export interface MorphologyConfig {
  enabled: boolean;
  prefixes: Affix[];
  suffixes: Affix[];
  templateWeights: {
    text: { bare: number; suffixed: number; prefixed: number; both: number };
    lexicon: { bare: number; suffixed: number; prefixed: number; both: number };
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Validate a LanguageConfig, throwing on any detected inconsistency.
 *
 * Checks:
 * - `phonemes[]` contains every phoneme reachable through `phonemeMaps`
 * - `graphemes[]` contains every grapheme reachable through `graphemeMaps`
 * - All probability values in `generationWeights` are in [0, 100]
 *
 * Call this during development or at startup to catch config errors early.
 */
export function validateConfig(config: LanguageConfig): void {
  // Check phonemes ⊇ phonemeMaps values
  const phonemeSet = new Set(config.phonemes);
  for (const position of ["onset", "nucleus", "coda"] as const) {
    for (const [sound, list] of config.phonemeMaps[position]) {
      for (const p of list) {
        if (!phonemeSet.has(p)) {
          throw new Error(
            `phonemeMaps.${position} contains phoneme "${p.sound}" (key "${sound}") not found in phonemes[]`
          );
        }
      }
    }
  }

  // Check graphemes ⊇ graphemeMaps values
  const graphemeSet = new Set(config.graphemes);
  for (const position of ["onset", "nucleus", "coda"] as const) {
    for (const [sound, list] of config.graphemeMaps[position]) {
      for (const g of list) {
        if (!graphemeSet.has(g)) {
          throw new Error(
            `graphemeMaps.${position} contains grapheme "${g.form}" (key "${sound}") not found in graphemes[]`
          );
        }
      }
    }
  }

  // Check probability values in range
  const { probability } = config.generationWeights;
  for (const [key, value] of Object.entries(probability)) {
    if (value < 0 || value > 100) {
      throw new Error(
        `generationWeights.probability.${key} is ${value}, must be in [0, 100]`
      );
    }
  }
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

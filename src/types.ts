import { RNG, RandomFunction } from "./utils/random";
import type { WordTrace } from "./core/trace";
import type { TraceCollector } from "./core/trace";

/**
 * Generation mode controlling syllable-count distribution and letter-length targeting.
 *
 * - `"text"` — simulates natural running text (heavy monosyllable bias).
 * - `"lexicon"` — simulates a dictionary/lexicon (balanced syllable distribution).
 */
export type GenerationMode = "text" | "lexicon";

/**
 * A single phoneme (minimal sound unit) in the generator's inventory.
 *
 * Each phoneme carries articulatory metadata and positional weightings that
 * control how likely it is to appear in onsets, codas, nuclei, and at word
 * boundaries.
 */
export interface Phoneme {
  /** IPA symbol or ASCII representation of the sound (e.g. `"p"`, `"ʃ"`). */
  sound: string;

  /**
   * Whether the vocal cords vibrate when producing this sound.
   *
   * @example `true` for /z/ ("buzz"), `false` for /s/ ("hiss").
   */
  voiced: boolean;

  /**
   * Whether the phoneme is aspirated — produced with a small burst of air
   * (e.g. /pʰ/ in "pat").
   */
  aspirated?: boolean;

  /**
   * How the airflow is manipulated to produce the sound.
   *
   * Examples:
   * - `"stop"` — airflow completely blocked then released (e.g. /p/, /t/).
   * - `"nasal"` — air flows through the nose (e.g. /m/, /n/).
   * - `"fricative"` — air forced through a narrow space (e.g. /f/, /s/).
   *
   * Future language support (not used in English):
   * tap/flap, trill, ejective/implosive stops, clicks,
   * lateral fricatives/affricates, pharyngeal/uvular/epiglottal fricatives/stops.
   */
  mannerOfArticulation:
    | "highVowel"           // Vowels: high (close)
    | "midVowel"            // Vowels: mid
    | "lowVowel"            // Vowels: low (open)
    | "glide"               // Approximants, semivowels (e.g. /j/, /w/)
    | "liquid"              // Lateral approximants and rhotics (e.g. /l/, /r/)
    | "nasal"               // Nasal stops (e.g. /m/, /n/, /ŋ/)
    | "fricative"           // Voiced or voiceless (e.g. /f/, /v/, /θ/)
    | "affricate"           // e.g. /tʃ/, /dʒ/
    | "stop"                // Plosives (e.g. /p/, /t/, /k/)
    | "sibilant"            // High-pitched fricatives (e.g. /s/, /ʃ/)
    | "lateralApproximant"; // Laterals without complete closure (e.g. /l/)

  /**
   * Where in the vocal tract the sound is produced.
   *
   * Examples:
   * - `"bilabial"` — both lips (e.g. /p/, /b/).
   * - `"alveolar"` — tongue against the alveolar ridge (e.g. /t/, /d/).
   * - `"velar"` — back of tongue against the soft palate (e.g. /k/, /g/).
   *
   * Future language support (not used in English):
   * retroflex, labial-palatal, pharyngeal,
   * epiglottal, uvular, alveolo-palatal.
   */
  placeOfArticulation:
    | "front"             // Vowel: front
    | "central"           // Vowel: central
    | "back"              // Vowel: back
    | "bilabial"          // Both lips (e.g. /p/, /b/)
    | "labiodental"       // Lip and teeth (e.g. /f/, /v/)
    | "dental"            // Tongue against teeth (e.g. /θ/, /ð/)
    | "alveolar"          // Tongue against alveolar ridge (e.g. /t/, /d/)
    | "postalveolar"      // Behind alveolar ridge (e.g. /ʃ/, /ʒ/)
    | "palatal"           // Tongue against hard palate (e.g. /j/)
    | "velar"             // Tongue against soft palate (e.g. /k/, /g/)
    | "glottal"           // Using the glottis (e.g. /h/)
    | "labial-velar";     // Simultaneous bilabial + velar (e.g. /w/)

  /** Weighting for appearing in a syllable nucleus (vowel position). */
  nucleus?: number;
  /** Weighting for appearing in a syllable onset (initial consonant cluster). */
  onset?: number;
  /** Weighting for appearing in a syllable coda (final consonant cluster). */
  coda?: number;
  /** Whether the vowel is tense (long) as opposed to lax (short). */
  tense?: boolean;

  /** Whether this vowel was reduced (e.g. schwa substitution in unstressed syllables). */
  reduced?: boolean;

  /** Weighting for appearing at the start of a word. */
  startWord: number;
  /** Weighting for appearing in the middle of a word. */
  midWord: number;
  /** Weighting for appearing at the end of a word. */
  endWord: number;
}

/** Type-safe accessor for a phoneme's positional weight (onset / nucleus / coda). */
export function getPhonemePositionWeight(p: Phoneme, position: 'onset' | 'nucleus' | 'coda'): number | undefined {
  switch (position) {
    case 'onset': return p.onset;
    case 'nucleus': return p.nucleus;
    case 'coda': return p.coda;
  }
}

/**
 * Context condition for a grapheme — restricts when a spelling is valid
 * based on surrounding phonemes and word position.
 */
export interface GraphemeCondition {
  /** Previous phoneme's sound must be in this list (or match a category shorthand). */
  leftContext?: string[];
  /** Next phoneme's sound must be in this list (or match a category shorthand). */
  rightContext?: string[];
  /** Previous phoneme's sound must NOT be in this list. */
  notLeftContext?: string[];
  /** Next phoneme's sound must NOT be in this list. */
  notRightContext?: string[];
  /** This grapheme is only valid in these word positions. */
  wordPosition?: ("initial" | "medial" | "final")[];
}

/**
 * A grapheme — the written (spelling) representation of a phoneme.
 *
 * Each grapheme maps a phoneme sound to one of its possible written forms,
 * weighted by frequency and syllable position.
 */
export interface Grapheme {
  /** The IPA/ASCII phoneme sound this grapheme represents. */
  phoneme: string;
  /** The written letter(s) (e.g. `"sh"` for /ʃ/, `"ough"` for /oʊ/). */
  form: string;
  /**
   * Index into the ORIGINS array indicating the grapheme's etymological source.
   * 0 = Germanic, 1 = French, 2 = Greek, 3 = Latin, 4 = Other.
   * @see ORIGINS in `elements/graphemes`
   */
  origin: number;
  /** Baseline frequency weight (higher → more likely to be chosen). */
  frequency: number;

  /** Weighting modifier when used in a syllable onset. */
  onset?: number;
  /** Weighting modifier when used in a syllable coda. */
  coda?: number;
  /** Weighting modifier when used in a syllable nucleus. */
  nucleus?: number;
  /** Weighting modifier when used inside a consonant cluster. */
  cluster?: number;

  /** Weighting for appearing at the start of a word. */
  startWord: number;
  /** Weighting for appearing in the middle of a word. */
  midWord: number;
  /** Weighting for appearing at the end of a word. */
  endWord: number;

  /** Context condition restricting when this grapheme is valid. */
  condition?: GraphemeCondition;
}

/**
 * The spelled (orthographic) representation of a generated word.
 */
export interface WrittenForm {
  /** The plain written form (e.g. `"brintle"`). */
  clean: string;
  /** The hyphenated form showing syllable breaks (e.g. `"brin-tle"`). */
  hyphenated: string;
}

/**
 * A fully generated word, including its phonological structure, pronunciation,
 * and written form.
 *
 * @example
 * ```ts
 * const word: Word = generateWord();
 * console.log(word.written.clean);  // "strandel"
 * console.log(word.pronunciation);  // IPA string
 * console.log(word.syllables.length); // 2
 * ```
 */
export interface Word {
  /** Ordered array of syllables that make up the word. */
  syllables: Syllable[];
  /** IPA pronunciation string for the full word. */
  pronunciation: string;
  /** Written (spelled) forms of the word. */
  written: WrittenForm;
  /** Generation trace (only present when `trace: true` was passed). */
  trace?: WordTrace;
}

/**
 * A single syllable, decomposed into onset, nucleus, and coda.
 *
 * @example
 * ```ts
 * // The syllable "stran" has:
 * //   onset:   [s, t, r]
 * //   nucleus: [a]
 * //   coda:    [n]
 * ```
 */
export interface Syllable {
  /** Initial consonant cluster (may be empty). */
  onset: Phoneme[];
  /** Vowel core of the syllable (typically one phoneme). */
  nucleus: Phoneme[];
  /** Final consonant cluster (may be empty). */
  coda: Phoneme[];
  /** Stress level: primary (`'ˈ'`), secondary (`'ˌ'`), or unstressed (`undefined`). */
  stress?: 'ˈ' | 'ˌ' | undefined;
}

/**
 * Options accepted by {@link generateWord}.
 */
export interface WordGenerationOptions {
  /** An existing partial word to continue building on. */
  word?: Word;
  /** Integer seed for deterministic generation. Same seed → same word. */
  seed?: number;
  /** Force the word to have exactly this many syllables (1–7). */
  syllableCount?: number;
  /**
   * Custom random-number generator. Takes priority over {@link seed} — when
   * both are provided the seed is silently ignored.
   *
   * Any `() => number` function returning values in [0, 1) is accepted.
   */
  rand?: RNG;
  /**
   * Generation mode controlling syllable-count distribution.
   * - `"text"` (default) — monosyllable-heavy, mimics running text.
   * - `"lexicon"` — balanced distribution, mimics a dictionary.
   */
  mode?: GenerationMode;
  /**
   * Whether to apply morphological affixation (prefixes/suffixes) to the
   * generated root word. Requires `morphology.enabled` in the language config.
   * Defaults to `false`.
   */
  morphology?: boolean;
  /**
   * When `true`, attaches a detailed generation trace to `word.trace`.
   * Purely observational — does not affect generation behavior.
   */
  trace?: boolean;
}

/**
 * Internal context threaded through the generation pipeline.
 * @internal
 */
export interface WordGenerationContext {
  /** Per-word RNG instance — all randomness in the pipeline draws from this. */
  rand: RNG;
  /** The word being built. */
  word: Word;
  /** Target number of syllables. */
  syllableCount: number;
  /** Index of the syllable currently being generated. */
  currSyllableIndex: number;
  /** Trace collector (only present when tracing is enabled). */
  trace?: TraceCollector;
}

/**
 * Internal context for building a consonant/vowel cluster.
 * @internal
 */
export interface ClusterContext {
  /** Per-cluster RNG instance (inherited from the word context). */
  rand: RNG;
  /** Syllable position this cluster occupies. */
  position: "onset" | "coda" | "nucleus";
  /** Phonemes accumulated so far in this cluster. */
  cluster: Phoneme[];
  /** Phoneme sounds to exclude from candidate selection. */
  ignore: string[];
  /** Whether this cluster begins the word. */
  isStartOfWord: boolean;
  /** Whether this cluster ends the word. */
  isEndOfWord: boolean;
  /** Maximum phonemes allowed in this cluster. */
  maxLength: number;
  /** Total syllable count of the word being generated. */
  syllableCount: number;
}

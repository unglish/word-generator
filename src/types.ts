import { RandomFunction } from "./utils/random";

/**
 * Represents a phoneme (speech sound) in the English phonological inventory.
 * 
 * Phonemes are the building blocks of word pronunciation. Each phoneme has
 * properties describing how it's articulated and where it can appear in syllables.
 * 
 * @example
 * ```ts
 * // The phoneme /p/ as in "pat"
 * const p: Phoneme = {
 *   sound: "p",
 *   voiced: false,
 *   mannerOfArticulation: "stop",
 *   placeOfArticulation: "bilabial",
 *   onset: 165,    // Can appear at syllable start
 *   coda: 50,      // Can appear at syllable end
 *   startWord: 8,  // Weight for word-initial position
 *   midWord: 10,
 *   endWord: 6,
 * };
 * ```
 */
export interface Phoneme {
  /** 
   * IPA symbol representing this sound.
   * @example "p", "t", "æ", "ʃ", "tʃ"
   */
  sound: string;

  /**
   * Whether the vocal cords vibrate when producing this sound.
   * 
   * - Voiced sounds (true): /z/ in "buzz", /b/ in "bat"
   * - Voiceless sounds (false): /s/ in "hiss", /p/ in "pat"
   */
  voiced: boolean;

  /**
   * Whether the phoneme is aspirated (has a burst of air).
   * @example /pʰ/ in "pat" vs unaspirated /p/ in "spat"
   */
  aspirated?: boolean;

  /**
   * How airflow is manipulated to produce the sound.
   * 
   * Categories include:
   * - Vowels: highVowel, midVowel, lowVowel
   * - Consonants: stop, fricative, nasal, liquid, glide, affricate, sibilant
   */
  mannerOfArticulation:
    | "highVowel"           // High/close vowels (e.g., /i/, /u/)
    | "midVowel"            // Mid vowels (e.g., /e/, /ə/)
    | "lowVowel"            // Low/open vowels (e.g., /æ/, /ɑ/)
    | "glide"               // Semivowels (e.g., /j/, /w/)
    | "liquid"              // Laterals and rhotics (e.g., /l/, /r/)
    | "nasal"               // Nasal stops (e.g., /m/, /n/, /ŋ/)
    | "fricative"           // Friction sounds (e.g., /f/, /v/, /θ/)
    | "affricate"           // Stop + fricative (e.g., /tʃ/, /dʒ/)
    | "stop"                // Plosives (e.g., /p/, /t/, /k/)
    | "sibilant"            // High-pitched fricatives (e.g., /s/, /ʃ/)
    | "lateralApproximant"; // Lateral sounds (e.g., /l/)

  /**
   * Where in the vocal tract the sound is produced.
   * 
   * Vowel positions: front, central, back
   * Consonant positions: bilabial, alveolar, velar, etc.
   */
  placeOfArticulation:
    | "front"             // Front vowels
    | "central"           // Central vowels
    | "back"              // Back vowels
    | "bilabial"          // Both lips (e.g., /p/, /b/, /m/)
    | "labiodental"       // Lip + teeth (e.g., /f/, /v/)
    | "dental"            // Tongue + teeth (e.g., /θ/, /ð/)
    | "alveolar"          // Tongue + alveolar ridge (e.g., /t/, /d/, /n/)
    | "postalveolar"      // Behind alveolar ridge (e.g., /ʃ/, /ʒ/)
    | "palatal"           // Hard palate (e.g., /j/)
    | "velar"             // Soft palate (e.g., /k/, /g/, /ŋ/)
    | "glottal"           // Glottis (e.g., /h/)
    | "labial-velar";     // Lips + soft palate (e.g., /w/)

  /** 
   * Weight for appearing as a syllable nucleus (vowel position).
   * Higher values = more likely. Undefined = not allowed.
   */
  nucleus?: number;

  /** 
   * Weight for appearing in syllable onset (before the vowel).
   * Higher values = more likely. Undefined = not allowed.
   */
  onset?: number;

  /** 
   * Weight for appearing in syllable coda (after the vowel).
   * Higher values = more likely. Undefined = not allowed.
   */
  coda?: number;

  /** 
   * Whether this is a tense vowel (longer duration).
   * @example /i:/ in "sheep" is tense, /ɪ/ in "ship" is lax
   */
  tense?: boolean;

  /** Weight for appearing at the start of a word */
  startWord: number;

  /** Weight for appearing in the middle of a word */
  midWord: number;

  /** Weight for appearing at the end of a word */
  endWord: number;
}

/**
 * Represents a grapheme (written representation) of a phoneme.
 * 
 * Maps phonemes to their possible spellings in English orthography,
 * with frequency weights based on how common each spelling is.
 * 
 * @example
 * ```ts
 * // The "ee" spelling of /i:/ as in "sheep"
 * const eeGrapheme: Grapheme = {
 *   phoneme: "i:",
 *   form: "ee",
 *   origin: 0,        // Germanic origin
 *   frequency: 50,
 *   startWord: 0,
 *   midWord: 4,
 *   endWord: 1,
 * };
 * ```
 */
export interface Grapheme {
  /** The phoneme this grapheme represents (IPA symbol) */
  phoneme: string;

  /** The written form (spelling) */
  form: string;

  /** 
   * Etymology origin index.
   * 0 = Germanic, 1 = French, 2 = Greek, 3 = Latin, 4 = Other
   */
  origin: number;

  /** Base frequency weight for this spelling */
  frequency: number;

  /** Weight modifier for syllable onset position */
  onset?: number;

  /** Weight modifier for syllable coda position */
  coda?: number;

  /** Weight modifier for syllable nucleus position */
  nucleus?: number;

  /** Weight modifier when part of a consonant cluster */
  cluster?: number;

  /** Weight for appearing at word start */
  startWord: number;

  /** Weight for appearing mid-word */
  midWord: number;

  /** Weight for appearing at word end */
  endWord: number;
}

/**
 * The written forms of a generated word.
 * 
 * @example
 * ```ts
 * const written: WrittenForm = {
 *   clean: "brondel",           // Plain text
 *   hyphenated: "bron&shy;del"  // With soft hyphen for line breaks
 * };
 * ```
 */
export interface WrittenForm {
  /** The word as plain text */
  clean: string;

  /** 
   * The word with soft hyphens (&shy;) marking syllable boundaries.
   * Useful for responsive text that may need to break across lines.
   */
  hyphenated: string;
}

/**
 * A generated word with its phonological structure and written form.
 * 
 * This is the main output type from `generateWord()`.
 * 
 * @example
 * ```ts
 * const word: Word = generateWord({ syllableCount: 2 });
 * 
 * console.log(word.written.clean);    // "brondel"
 * console.log(word.pronunciation);     // "ˈbrɔn.dəl"
 * console.log(word.syllables.length);  // 2
 * 
 * // Access syllable structure
 * const firstSyllable = word.syllables[0];
 * console.log(firstSyllable.onset);    // [Phoneme for /b/, Phoneme for /r/]
 * console.log(firstSyllable.nucleus);  // [Phoneme for /ɔ/]
 * console.log(firstSyllable.coda);     // [Phoneme for /n/]
 * ```
 */
export interface Word {
  /** 
   * Array of syllables making up the word.
   * Each syllable has onset, nucleus, and coda components.
   */
  syllables: Syllable[];

  /** 
   * IPA pronunciation with stress markers.
   * - ˈ = primary stress
   * - ˌ = secondary stress
   * - . = syllable boundary
   * @example "ˈbrɔn.dəl"
   */
  pronunciation: string;

  /** Written forms of the word */
  written: WrittenForm;
}

/**
 * A syllable structure following the onset-nucleus-coda model.
 * 
 * In phonology, syllables are divided into:
 * - **Onset**: Initial consonant(s) before the vowel
 * - **Nucleus**: The vowel (required)
 * - **Coda**: Final consonant(s) after the vowel
 * 
 * @example
 * ```ts
 * // The syllable "strength" /strɛŋkθ/
 * const syllable: Syllable = {
 *   onset: [phonemeS, phonemeT, phonemeR],  // "str"
 *   nucleus: [phonemeE],                     // "e"
 *   coda: [phonemeNG, phonemeK, phonemeTH], // "ngth"
 *   stress: 'ˈ'                              // primary stress
 * };
 * ```
 */
export interface Syllable {
  /** Consonant(s) at the start of the syllable (may be empty) */
  onset: Phoneme[];

  /** The vowel(s) forming the syllable core (always at least one) */
  nucleus: Phoneme[];

  /** Consonant(s) at the end of the syllable (may be empty) */
  coda: Phoneme[];

  /** 
   * Stress marker for this syllable.
   * - 'ˈ' = primary stress
   * - 'ˌ' = secondary stress
   * - undefined = unstressed
   */
  stress?: "ˈ" | "ˌ" | undefined;
}

/**
 * Options for configuring word generation.
 * 
 * @example
 * ```ts
 * // Generate a 3-syllable word with a specific seed
 * const options: WordGenerationOptions = {
 *   syllableCount: 3,
 *   seed: 42
 * };
 * const word = generateWord(options);
 * ```
 */
export interface WordGenerationOptions {
  /** 
   * Existing word to extend or modify.
   * @internal Primarily for internal use.
   */
  word?: Word;

  /** 
   * Seed for deterministic random generation.
   * Same seed always produces the same word.
   * @example generateWord({ seed: 42 }) // Always returns same word
   */
  seed?: number;

  /** 
   * Number of syllables to generate (1-7).
   * If omitted, randomly chosen with realistic distribution:
   * - 1 syllable: ~7%
   * - 2 syllables: ~44%
   * - 3 syllables: ~44%
   * - 4+ syllables: ~5%
   */
  syllableCount?: number;

  /** 
   * Custom random function to use instead of the default.
   * Must return a number between 0 and 1.
   * @internal Primarily for internal use. Use `seed` for determinism.
   */
  rand?: RandomFunction;
}

/**
 * Internal context object passed through word generation.
 * @internal
 */
export interface WordGenerationContext {
  /** The word being constructed */
  word: Word;

  /** Total number of syllables to generate */
  syllableCount: number;

  /** Current syllable index (0-based) */
  currSyllableIndex: number;
}

/**
 * Internal context for building consonant/vowel clusters.
 * @internal
 */
export interface ClusterContext {
  /** Which part of the syllable we're building */
  position: SyllablePosition;

  /** Phonemes collected so far in this cluster */
  cluster: Phoneme[];

  /** Phoneme sounds to exclude (e.g., to avoid repetition) */
  ignore: string[];

  /** Whether this is the first syllable of the word */
  isStartOfWord: boolean;

  /** Whether this is the last syllable of the word */
  isEndOfWord: boolean;

  /** Maximum phonemes allowed in this cluster */
  maxLength: number;

  /** Total syllables in the word */
  syllableCount: number;
}

/** 
 * Position within a syllable structure.
 * - onset: Before the vowel
 * - nucleus: The vowel itself
 * - coda: After the vowel
 */
export type SyllablePosition = "onset" | "coda" | "nucleus";

/**
 * Type-safe accessor for position-based weights on Phoneme/Grapheme objects.
 * Returns the weight for a given position, or undefined if not set.
 * @internal
 */
export function getPositionWeight<T extends { onset?: number; nucleus?: number; coda?: number }>(
  item: T,
  position: SyllablePosition
): number | undefined {
  switch (position) {
  case "onset":
    return item.onset;
  case "nucleus":
    return item.nucleus;
  case "coda":
    return item.coda;
  }
}

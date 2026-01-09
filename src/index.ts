import generateWord from "./core/generate.js";
import * as phonemes from "./elements/phonemes.js";
import * as graphemes from "./elements/graphemes/index.js";
import * as random from "./utils/random.js";

/**
 * @unglish/word-generator - Generate English-sounding nonsense words
 * 
 * A library for generating phonologically plausible nonsense words based on
 * English phonotactic rules. Supports deterministic generation via seeding.
 * 
 * @example Basic usage
 * ```ts
 * import unglish from '@unglish/word-generator';
 * 
 * // Generate a random word
 * const word = unglish.generateWord();
 * console.log(word.written.clean);    // e.g., "brondel"
 * console.log(word.pronunciation);     // e.g., "ˈbrɔn.dəl"
 * ```
 * 
 * @example Control syllable count
 * ```ts
 * // Generate a monosyllabic word
 * const short = unglish.generateWord({ syllableCount: 1 });
 * 
 * // Generate a longer word
 * const long = unglish.generateWord({ syllableCount: 4 });
 * ```
 * 
 * @example Deterministic generation with seeds
 * ```ts
 * // Same seed always produces the same word
 * const word1 = unglish.generateWord({ seed: 42 });
 * const word2 = unglish.generateWord({ seed: 42 });
 * console.log(word1.written.clean === word2.written.clean); // true
 * ```
 * 
 * @example Using seeded RNG for batch generation
 * ```ts
 * // Create a seeded random function for consistent batches
 * const rng = unglish.random.seedRandom(12345);
 * 
 * // Override the global RNG
 * unglish.random.overrideRand(rng);
 * 
 * // Generate multiple words with the same seed sequence
 * const words = Array.from({ length: 10 }, () => unglish.generateWord());
 * 
 * // Reset to default random
 * unglish.random.resetRand();
 * ```
 */
const wordGenerator = {
  /**
   * Generates a single English-sounding nonsense word.
   * 
   * @param options - Configuration options for word generation
   * @param options.syllableCount - Number of syllables (1-7). If omitted, randomly chosen with realistic distribution.
   * @param options.seed - Seed for deterministic generation. Same seed = same word.
   * @returns A Word object containing syllables, pronunciation, and written forms
   * 
   * @example
   * ```ts
   * const word = generateWord();
   * console.log(word.written.clean);      // "glester"
   * console.log(word.written.hyphenated); // "gles&shy;ter"
   * console.log(word.pronunciation);       // "ˈglɛs.tɚ"
   * console.log(word.syllables.length);    // 2
   * ```
   */
  generateWord,

  /**
   * Random number generation utilities for seeding and deterministic output.
   * 
   * @example
   * ```ts
   * // Create a seeded RNG
   * const rng = random.seedRandom(42);
   * 
   * // Use it for generation
   * random.overrideRand(rng);
   * const word = generateWord(); // deterministic
   * 
   * // Reset to default
   * random.resetRand();
   * ```
   */
  random,

  /**
   * Phoneme inventory and pre-computed maps.
   * 
   * Contains the English phoneme definitions used for word generation,
   * including consonants, vowels, diphthongs, and their phonotactic properties.
   * 
   * @example
   * ```ts
   * // Access the phoneme list
   * console.log(phonemes.phonemes.length); // 51 phonemes
   * 
   * // Access phonemes by position
   * const onsetPhonemes = phonemes.phonemeMaps.onset;
   * const codaPhonemes = phonemes.phonemeMaps.coda;
   * ```
   */
  phonemes,

  /**
   * Grapheme (written form) inventory and pre-computed maps.
   * 
   * Contains mappings from phonemes to their written representations,
   * with frequency weights based on English orthography patterns.
   * 
   * @example
   * ```ts
   * // Access the grapheme list
   * console.log(graphemes.graphemes.length); // 190 grapheme mappings
   * 
   * // Graphemes are organized by syllable position
   * const onsetGraphemes = graphemes.graphemeMaps.onset;
   * ```
   */
  graphemes,
};

export default wordGenerator;

// Also export types for TypeScript users
export type {
  Word,
  Syllable,
  Phoneme,
  Grapheme,
  WordGenerationOptions,
  WrittenForm,
} from "./types.js";

import generateWord from "./core/generate.js";
import * as phonemes from "./elements/phonemes.js";
import * as graphemes from "./elements/graphemes.js";
import * as random from "./utils/random.js";

/**
 * The word-generator public API.
 *
 * Provides access to word generation, phoneme/grapheme inventories, and
 * random-number utilities.
 *
 * @example
 * ```ts
 * import wordGenerator from "word-generator";
 *
 * // Generate a random word
 * const word = wordGenerator.generateWord();
 * console.log(word.written.clean); // e.g. "brintle"
 *
 * // Generate a deterministic word with a seed
 * const seeded = wordGenerator.generateWord({ seed: 42 });
 *
 * // Override the RNG
 * wordGenerator.random.overrideRand(Math.random);
 *
 * // Inspect available phonemes
 * console.log(wordGenerator.phonemes.phonemes.length);
 * ```
 */
export default {
  /**
   * Generate a single random word.
   *
   * @example
   * ```ts
   * const word = wordGenerator.generateWord();
   * console.log(word.written.clean);
   * ```
   */
  generateWord,

  /**
   * Random-number utilities used internally by the generator.
   * Exposes {@link random.overrideRand} and {@link random.getRand}.
   */
  random,

  /**
   * The phoneme inventory and related lookup tables (onset/coda/nucleus maps,
   * sonority levels, invalid cluster patterns, etc.).
   */
  phonemes,

  /**
   * The grapheme inventory — spelling representations for each phoneme,
   * with positional frequency data.
   */
  graphemes,
};

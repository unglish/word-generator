import { generateWord } from "./core/generate.js";
import * as phonemes from "./elements/phonemes.js";
import * as graphemes from "./elements/graphemes/index.js";
import * as random from "./utils/random.js";

export { createGenerator, generateWord, generateWords, WordGenerator } from "./core/generate.js";
export type { GenerationMode } from "./types.js";
export {
  LanguageConfig,
  BySyllablePosition,
  SonorityHierarchy,
  SyllableStructureRules,
  StressRules,
  GenerationWeights,
  PhonemeLengthWeights,
  PhonemeToSyllableWeights,
  validateConfig,
} from "./config/language.js";
export { OTStressConfig, OTConstraint, ConstraintWeight } from "./core/ot-stress.js";
export { englishConfig } from "./config/english.js";
export { RNG, createSeededRng, createDefaultRng } from "./utils/random.js";
export type { WordTrace, StageSnapshot, SyllableSnapshot, GraphemeTrace, DoublingTrace, RepairTrace, MorphologyTrace, StructuralTrace } from "./core/trace.js";
export { TraceCollector } from "./core/trace.js";

/**
 * The word-generator public API.
 *
 * For custom language configs, use the named export {@link createGenerator}:
 * ```ts
 * import { createGenerator, englishConfig } from "word-generator";
 * const gen = createGenerator(englishConfig);
 * const word = gen.generateWord();
 * ```
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
   * Generate a single random word using the default English config.
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

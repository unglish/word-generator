import * as phonemes from "./elements/phonemes.js";
import * as graphemes from "./elements/graphemes/index.js";
import * as random from "./utils/random.js";
export { createGenerator, generateWord, generateWords, WordGenerator } from "./core/generate.js";
export { LanguageConfig, BySyllablePosition, SonorityHierarchy, SyllableStructureRules, StressRules, GenerationWeights, validateConfig } from "./config/language.js";
export { englishConfig } from "./config/english.js";
export { RNG, createSeededRng, createDefaultRng } from "./utils/random.js";
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
declare const _default: {
    /**
     * Generate a single random word using the default English config.
     *
     * @example
     * ```ts
     * const word = wordGenerator.generateWord();
     * console.log(word.written.clean);
     * ```
     */
    generateWord: (options?: import("./types.js").WordGenerationOptions) => import("./types.js").Word;
    /**
     * Random-number utilities used internally by the generator.
     * Exposes {@link random.overrideRand} and {@link random.getRand}.
     */
    random: typeof random;
    /**
     * The phoneme inventory and related lookup tables (onset/coda/nucleus maps,
     * sonority levels, invalid cluster patterns, etc.).
     */
    phonemes: typeof phonemes;
    /**
     * The grapheme inventory — spelling representations for each phoneme,
     * with positional frequency data.
     */
    graphemes: typeof graphemes;
};
export default _default;
//# sourceMappingURL=index.d.ts.map
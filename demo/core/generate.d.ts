import { ClusterContext, Phoneme, WordGenerationOptions, Word } from "../types.js";
import { LanguageConfig } from "../config/language.js";
/**
 * A word generator instance created from a {@link LanguageConfig}.
 */
export interface WordGenerator {
    /** Generate a single random word. */
    generateWord: (options?: WordGenerationOptions) => Word;
}
/**
 * Creates a word generator from a {@link LanguageConfig}.
 *
 * All phoneme inventories, grapheme maps, sonority levels, and cluster
 * constraints are derived from the config at creation time — no global
 * state is referenced during generation.
 *
 *
 * @param config - The language configuration to build from.
 * @returns A {@link WordGenerator} instance.
 *
 * @example
 * ```ts
 * import { createGenerator, englishConfig } from "word-generator";
 *
 * const gen = createGenerator(englishConfig);
 * const word = gen.generateWord({ seed: 42 });
 * console.log(word.written.clean);
 * ```
 */
export declare function createGenerator(config: LanguageConfig): WordGenerator;
/**
 * Generates a random English-like word. Shorthand for the default English generator.
 *
 * @example
 * ```ts
 * import { generateWord } from "word-generator";
 * const word = generateWord();
 * ```
 */
export declare const generateWord: (options?: WordGenerationOptions) => Word;
/**
 * Generate multiple words sharing a single RNG instance.
 *
 * With a shared RNG, `generateWords(50, { seed: 42 })` is deterministic AND
 * produces different words for each index. This is **not** equivalent to
 * calling `generateWord({ seed: 42 })` 50 times — the latter creates 50
 * identical RNG streams and therefore 50 identical words.
 *
 * @param count - Number of words to generate.
 * @param options - Generation options (seed, rand, syllableCount, etc.).
 * @returns An array of generated {@link Word} objects.
 *
 * @example
 * ```ts
 * import { generateWords } from "word-generator";
 * const words = generateWords(50, { seed: 42 });
 * // All 50 words are different but fully deterministic.
 * ```
 */
export declare const generateWords: (count: number, options?: WordGenerationOptions) => Word[];
export default generateWord;
/** @internal Build a cluster using the default English runtime. For tests only. */
export declare function _buildCluster(context: ClusterContext): Phoneme[];
/** @internal Check cluster validity using the default English runtime. For tests only. */
export declare function _isValidCluster(cluster: Phoneme[], position: "onset" | "coda" | "nucleus"): boolean;
//# sourceMappingURL=generate.d.ts.map
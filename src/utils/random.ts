/**
 * A function that returns a random number between 0 (inclusive) and 1 (exclusive).
 * Used for all randomness in word generation.
 */
export type RandomFunction = () => number;

/**
 * Default random number generator using XORShift algorithm.
 * Provides fast, reasonable-quality pseudo-random numbers.
 * @internal
 */
const xorshift: RandomFunction = (() => {
  let state = Date.now();
  return () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 2 ** 32;
  };
})();

const rand: RandomFunction = xorshift;
let currentRand: RandomFunction = rand;

/**
 * Gets the current random number generator function.
 * 
 * @returns The active RandomFunction
 * @internal Used internally by generation functions
 */
export const getRand = (): RandomFunction => currentRand;

/**
 * Overrides the global random number generator.
 * 
 * Use this with a seeded RNG for deterministic word generation,
 * or to inject a custom random source.
 * 
 * @param randomFunc - A function returning numbers between 0 and 1
 * 
 * @example
 * ```ts
 * import { overrideRand, resetRand } from '@unglish/word-generator';
 * import { createSeededRandom } from '@unglish/word-generator';
 * 
 * // Use seeded random for reproducible results
 * const seededRng = createSeededRandom(42);
 * overrideRand(seededRng);
 * 
 * const word1 = generateWord(); // deterministic
 * const word2 = generateWord(); // different, but reproducible
 * 
 * // Reset to default random
 * resetRand();
 * ```
 */
export const overrideRand = (randomFunc: RandomFunction): void => {
  currentRand = randomFunc;
};

/**
 * Resets the random number generator to the default (XORShift).
 * 
 * Call this after using a seeded RNG to restore normal random behavior.
 * 
 * @example
 * ```ts
 * overrideRand(seededRng);
 * // ... generate deterministic words ...
 * resetRand(); // back to normal randomness
 * ```
 */
export const resetRand = (): void => {
  currentRand = rand;
};

// Re-export seeded random creator for convenience
export { createSeededRandom, createSeededRandom as seedRandom } from "./createSeededRandom.js";

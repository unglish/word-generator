/**
 * Creates a seeded pseudo-random number generator.
 * 
 * The same seed always produces the same sequence of numbers,
 * enabling deterministic word generation.
 * 
 * @param seed - Any number to seed the generator
 * @returns A function that returns pseudo-random numbers between 0 and 1
 * 
 * @example Basic usage
 * ```ts
 * const rng = createSeededRandom(42);
 * console.log(rng()); // 0.5465...
 * console.log(rng()); // 0.8912...
 * 
 * // Same seed = same sequence
 * const rng2 = createSeededRandom(42);
 * console.log(rng2()); // 0.5465... (same as above)
 * ```
 * 
 * @example Deterministic word generation
 * ```ts
 * import { createSeededRandom, overrideRand, generateWord } from '@unglish/word-generator';
 * 
 * const rng = createSeededRandom(12345);
 * overrideRand(rng);
 * 
 * const words = [
 *   generateWord(),
 *   generateWord(),
 *   generateWord(),
 * ];
 * // These 3 words will always be the same for seed 12345
 * ```
 */
export const createSeededRandom = (seed: number): (() => number) => {
  let s = seed;
  return () => {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
};

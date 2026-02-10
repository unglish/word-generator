import type { RNG } from "./random.js";

/**
 * Returns a random boolean given a weight (optional).
 * ```
 * randomBool(.2, rand); // false
 * ```
 * @param weight=.5 - A weight to test the boolean against, if rand() is less than this number, true is returned. Defaults to 0.5
 * @param rand - RNG function returning a value in [0, 1).
 */
// sourced from: https://github.com/liamegan/fxhash-helpers/blob/main/src/index.js
export default (weight: number, rand: RNG): boolean => {
  if (isNaN(weight)) weight = 0.5;
  return rand() < weight;
};

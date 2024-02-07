import { rand } from "./random";

/**
 * Returns a random boolean given a weight (optional).
 * ```
 * randomBool(.2); // false
 * ```
 * @param weight=.5 - A weight to test the boolean against, if fxrand is less than this number, true is returned. Defaults to 0.5
 */
// sourced from: https://github.com/liamegan/fxhash-helpers/blob/main/src/index.js
export const randomBool = function (weight: number) {
  if (isNaN(weight)) weight = 0.5;
  return rand() < weight;
};
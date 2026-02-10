import type { RNG } from "./random.js";
/**
 * Returns a weighted random option, given an array of options with weights.
 * ```
 * let color = getWeightedOption([
 *   ["red", 10],
 *   ["green", 30],
 *   ["blue", 50],
 * ], rand);
 * ```
 * Courtesy Mark Knol, T: @mknol (sourced from: https://github.com/liamegan/fxhash-helpers/blob/main/src/index.js)
 * @param options - options in the format of [ [ string: optionName, int: optionNumber ] ]
 * @param rand - RNG function returning a value in [0, 1).
 */
declare const getWeightedOption: <T>(options: [T, number][], rand: RNG) => T;
export default getWeightedOption;
//# sourceMappingURL=getWeightedOption.d.ts.map
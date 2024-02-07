import { pick } from "./pick";

/**
 * Returns a weighted random option, given an array of options with weights.
 * ```
 * let color = getWeightedOption([
 *   ["red", 10],
 *   ["green", 30],
 *   ["blue", 50],
 * ]);
 * ```
 * Curtesy Mark Knol, T: @mknol (sourced from: https://github.com/liamegan/fxhash-helpers/blob/main/src/index.js)
 * @param options - options in the format of [ [ string: optionName, int: optionNumber ] ]
 */
export const getWeightedOption = function (options) {
  let choices: any[] = [];
  for (const i in options)
    choices = choices.concat(new Array(options[i][1]).fill(options[i][0]));
  return pick(choices);
};
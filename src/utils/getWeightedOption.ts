import pick from "./pick.js";

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
export default (options: (number | { sound: string; type: string; sonority: number; complexity: number; nucleus: number; onset?: undefined; coda?: undefined; } | { sound: string; type: string; sonority: number; complexity: number; onset: number; coda: number; nucleus?: undefined; } | undefined)[][] | (string | number)[][]) => {
  let choices: any[] = [];
  for (const i in options)
    choices = choices.concat(new Array(options[i][1]).fill(options[i][0]));
  return pick(choices);
};
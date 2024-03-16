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
const getWeightedOption = <T>(options: [T, number][]): T => {
  let choices: T[] = [];
  for (const option of options)
    choices = choices.concat(new Array(option[1]).fill(option[0]));

  return pick(choices);
};

export default getWeightedOption;

import { getRand } from "./random.js";

/**
 * Returns a weighted random option, given an array of options with weights.
 * ```
 * let color = getWeightedOption([
 *   ["red", 10],
 *   ["green", 30],
 *   ["blue", 50],
 * ]);
 * ```
 * Courtesy Mark Knol, T: @mknol (sourced from: https://github.com/liamegan/fxhash-helpers/blob/main/src/index.js)
 * @param options - options in the format of [ [ string: optionName, int: optionNumber ] ]
 */
const getWeightedOption = <T>(options: [T, number][]): T => {
  const totalWeight = options.reduce((sum, [, weight]) => sum + weight, 0);
  const randomValue = getRand()() * totalWeight;
  
  let cumulativeWeight = 0;
  for (const [option, weight] of options) {
    cumulativeWeight += weight;
    if (randomValue < cumulativeWeight) {
      return option;
    }
  }
  
  // Fallback to last option (should rarely happen due to floating-point precision)
  return options[options.length - 1][0];
};

export default getWeightedOption;

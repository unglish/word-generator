import { getRand } from "./random.js";

/**
 * Pre-computed weights for fast weighted random selection.
 * Stores cumulative weights to enable O(log n) binary search lookup
 * instead of O(n) linear scan.
 */
export interface PrecomputedWeights<T> {
  options: T[];
  cumulativeWeights: number[];
  totalWeight: number;
}

/**
 * Pre-computes cumulative weights from an array of [option, weight] pairs.
 * This should be called once at module initialization for static weight tables.
 * 
 * @param options - Array of [option, weight] pairs
 * @returns PrecomputedWeights object for use with getPrecomputedOption
 */
export function precomputeWeights<T>(options: readonly (readonly [T, number])[]): PrecomputedWeights<T> {
  const result: PrecomputedWeights<T> = {
    options: [],
    cumulativeWeights: [],
    totalWeight: 0,
  };

  for (const [option, weight] of options) {
    result.totalWeight += weight;
    result.options.push(option);
    result.cumulativeWeights.push(result.totalWeight);
  }

  return result;
}

/**
 * Selects a weighted random option using pre-computed cumulative weights.
 * Uses binary search for O(log n) performance.
 * 
 * @param precomputed - Pre-computed weights from precomputeWeights()
 * @returns The selected option
 */
export function getPrecomputedOption<T>(precomputed: PrecomputedWeights<T>): T {
  const target = getRand()() * precomputed.totalWeight;
  const { cumulativeWeights, options } = precomputed;

  // Binary search for the correct bucket
  let low = 0;
  let high = cumulativeWeights.length - 1;

  while (low < high) {
    const mid = (low + high) >> 1;
    if (cumulativeWeights[mid] <= target) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return options[low];
}
